"use server";

import { createServerClient } from "@supabase/ssr";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type CreateProjectResult =
  | { success: true }
  | { success: false; error: string };

const ACCESS_TOKEN_COOKIE = "sb_access_token";
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

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

async function createActionSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Server Action dışında set kısıtlı olabilir
        }
      },
      remove: (name: string, options?: Record<string, unknown>) => {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // ignore
        }
      },
    },
  });

  // Nest login ile yazılan JWT cookie'lerini session'a bağla
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error("[createProject] setSession error:", error.message);
    }
  } else if (accessToken) {
    // refresh yoksa yine de Authorization ile devam edilebilsin
    console.warn(
      "[createProject] refresh_token cookie yok; access_token ile getUser denenecek.",
    );
  } else {
    console.warn("[createProject] sb_access_token cookie bulunamadı.");
  }

  return { supabase, accessToken };
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
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { success: false, error: "Proje adı zorunludur." };
  }

  const description = input.description?.trim() || null;
  const { supabase, accessToken } = await createActionSupabaseClient();

  const {
    data: { user },
    error: userError,
  } = accessToken
    ? await supabase.auth.getUser(accessToken)
    : await supabase.auth.getUser();

  if (userError || !user) {
    console.error(
      "[createProject] Kullanıcı alınamadı:",
      userError?.message ?? "user null",
      "| accessTokenPresent:",
      Boolean(accessToken),
    );
    return {
      success: false,
      error: "Kullanıcı doğrulanamadı. Lütfen tekrar giriş yapın.",
    };
  }

  console.info("[createProject] Authenticated user:", user.id);

  const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
    supabase,
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

  let { error: insertError } = await supabase
    .from("projects")
    .insert(payload)
    .select("id")
    .single();

  if (insertError?.message?.includes("user_id")) {
    const withoutUserId = {
      name: payload.name,
      description: payload.description,
      workspace_id: payload.workspace_id,
      created_by: payload.created_by,
    };
    ({ error: insertError } = await supabase
      .from("projects")
      .insert(withoutUserId)
      .select("id")
      .single());
  }

  if (insertError) {
    console.error("[createProject] insert error:", insertError.message);
    return { success: false, error: insertError.message };
  }

  revalidatePath("/");
  return { success: true };
}

/** Geriye dönük uyumluluk */
export const createProjectAction = createProject;
