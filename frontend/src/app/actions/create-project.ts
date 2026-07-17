"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type CreateProjectResult =
  | { success: true }
  | { success: false; error: string };

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
  }

  return { url, anonKey };
}

async function resolveWorkspaceId(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<{ workspaceId: string | null; error?: string }> {
  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (membersError) {
    return { workspaceId: null, error: membersError.message };
  }

  const existingId = members?.[0]?.workspace_id as string | undefined;
  if (existingId) {
    return { workspaceId: existingId };
  }

  const { data: workspace, error: workspaceError } = await supabase
    .from("workspaces")
    .insert({
      name: "Kişisel Çalışma Alanı",
      description: "Otomatik oluşturulan kişisel alan",
    })
    .select("id")
    .single();

  if (workspaceError || !workspace?.id) {
    return {
      workspaceId: null,
      error: workspaceError?.message ?? "Çalışma alanı oluşturulamadı.",
    };
  }

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspace.id,
      user_id: userId,
      role: "Admin",
    });

  if (memberError) {
    return { workspaceId: null, error: memberError.message };
  }

  return { workspaceId: workspace.id as string };
}

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  try {
    const cookieStore = await cookies();

    // 1) Terminalde gelen tüm cookie'leri gör
    console.log(
      "Gelen Cookie'ler:",
      cookieStore.getAll().map((c) => ({
        name: c.name,
        valuePreview: c.value ? `${c.value.slice(0, 24)}…` : "(empty)",
        length: c.value?.length ?? 0,
      })),
    );

    const name = input.name?.trim() ?? "";
    if (!name) {
      return { success: false, error: "Proje adı zorunludur." };
    }

    const description = input.description?.trim() || null;
    const { url, anonKey } = getSupabaseEnv();

    // 2) Token çıkarma (manuel)
    const accessToken =
      cookieStore.get("sb_access_token")?.value ||
      cookieStore.get("access_token")?.value ||
      null;
    const refreshToken =
      cookieStore.get("sb_refresh_token")?.value ||
      cookieStore.get("refresh_token")?.value ||
      "";

    console.log("[createProject] Token durumu:", {
      hasAccessToken: Boolean(accessToken),
      hasRefreshToken: Boolean(refreshToken),
      accessTokenLength: accessToken?.length ?? 0,
    });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        get: (cookieName: string) => cookieStore.get(cookieName)?.value,
        set: (cookieName: string, value: string, options?: Record<string, unknown>) => {
          try {
            cookieStore.set(cookieName, value, options);
          } catch {
            // ignore
          }
        },
        remove: (cookieName: string, options?: Record<string, unknown>) => {
          try {
            cookieStore.set(cookieName, "", { ...options, maxAge: 0 });
          } catch {
            // ignore
          }
        },
      },
    });

    // 3) Manuel oturum açma (fallback)
    if (accessToken) {
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
      });

      if (sessionError) {
        console.warn(
          "[createProject] setSession uyarısı:",
          sessionError.message,
          "→ getUser(jwt) fallback deneniyor",
        );
      }
    } else {
      console.error("[createProject] access/sb_access_token cookie yok");
    }

    let user = null as Awaited<
      ReturnType<typeof supabase.auth.getUser>
    >["data"]["user"];

    if (accessToken) {
      const { data, error } = await supabase.auth.getUser(accessToken);
      user = data.user;
      if (error || !user) {
        console.error(
          "[createProject] getUser(jwt) null:",
          error?.message ?? "user null",
        );
      }
    } else {
      const { data, error } = await supabase.auth.getUser();
      user = data.user;
      if (error || !user) {
        console.error(
          "[createProject] getUser() null:",
          error?.message ?? "user null",
        );
      }
    }

    if (!user) {
      console.error(
        "[createProject] Kullanıcı bulunamadı (null user). Cookie/token senkronunu kontrol et.",
      );
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    console.info("[createProject] Authenticated user:", user.id);

    // RLS için Authorization header'lı istemci (auth.uid() / JWT)
    const authedClient = accessToken
      ? createClient(url, anonKey, {
          global: { headers: { Authorization: `Bearer ${accessToken}` } },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        })
      : supabase;

    const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
      authedClient,
      user.id,
    );

    if (!workspaceId) {
      return {
        success: false,
        error: workspaceError ?? "Çalışma alanı bulunamadı.",
      };
    }

    const payload = {
      name,
      description,
      workspace_id: workspaceId,
      created_by: user.id,
      user_id: user.id,
    };

    let { error: insertError } = await authedClient
      .from("projects")
      .insert(payload)
      .select("id")
      .single();

    // Şema: user_id yoksa created_by ile dene
    if (insertError?.message?.includes("user_id")) {
      const withoutUserId = {
        name: payload.name,
        description: payload.description,
        workspace_id: payload.workspace_id,
        created_by: payload.created_by,
      };
      ({ error: insertError } = await authedClient
        .from("projects")
        .insert(withoutUserId)
        .select("id")
        .single());
    }

    if (insertError) {
      console.error("[createProject] insert/RLS/şema hatası:", insertError);
      return {
        success: false,
        error: insertError.message || "Proje kaydedilirken bir hata oluştu.",
      };
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Proje oluşturulurken beklenmeyen bir hata oluştu.";
    console.error("[createProject] catch:", error);
    return { success: false, error: message };
  }
}

/** Geriye dönük uyumluluk */
export const createProjectAction = createProject;
