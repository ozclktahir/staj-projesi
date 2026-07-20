"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type CreateProjectInput = {
  name: string;
  description?: string;
};

/** Client'a her zaman düz, serileştirilebilir JSON dönülür. */
export type CreateProjectResult =
  | { success: true }
  | { success: false; error: string };

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { url, anonKey };
}

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Proje oluşturulurken beklenmeyen bir hata oluştu.";
  }
}

function isNextRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    String((error as { digest: string }).digest).startsWith("NEXT_REDIRECT")
  );
}

/**
 * Anon key + kullanıcı JWT (Bearer). Service role burada KULLANILMAZ;
 * RLS politikaları auth.uid() üzerinden uygulanır.
 */
function createUserScopedClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function resolveWorkspaceId(
  supabase: SupabaseClient,
  authUserId: string,
): Promise<{ workspaceId: string | null; error?: string }> {
  // auth.uid() ile birebir aynı olmalı (getUser().id)
  const userId = authUserId;

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .limit(1);

  if (membersError) {
    return { workspaceId: null, error: toPlainErrorMessage(membersError) };
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
      owner_id: userId,
    })
    .select("id")
    .single();

  if (workspaceError || !workspace?.id) {
    return {
      workspaceId: null,
      error: toPlainErrorMessage(
        workspaceError ?? "Çalışma alanı oluşturulamadı.",
      ),
    };
  }

  // Trigger yoksa: user_id === auth.uid() ile manuel INSERT
  const memberPayload = {
    workspace_id: workspace.id as string,
    user_id: userId,
    role: "Admin",
  };

  if (memberPayload.user_id !== authUserId) {
    return {
      workspaceId: null,
      error: "workspace_members user_id, auth.uid() ile eşleşmiyor.",
    };
  }

  console.info("[createProject] workspace_members insert", {
    workspace_id: memberPayload.workspace_id,
    user_id: memberPayload.user_id,
    auth_uid: authUserId,
  });

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert(memberPayload);

  if (memberError) {
    const msg = toPlainErrorMessage(memberError).toLowerCase();
    const alreadyMember =
      msg.includes("duplicate") ||
      msg.includes("unique") ||
      (typeof memberError === "object" &&
        memberError !== null &&
        "code" in memberError &&
        (memberError as { code?: string }).code === "23505");

    if (!alreadyMember) {
      console.error("[createProject] workspace_members insert:", memberError);
      return {
        workspaceId: null,
        error: toPlainErrorMessage(memberError),
      };
    }
  }

  return { workspaceId: workspace.id as string };
}

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  let shouldRevalidate = false;

  try {
    const cookieStore = await cookies();

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
    const env = getSupabaseEnv();
    if (!env) {
      return {
        success: false,
        error:
          "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
      };
    }

    const accessToken =
      cookieStore.get("sb_access_token")?.value ||
      cookieStore.get("access_token")?.value ||
      null;

    if (!accessToken) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const supabase = createUserScopedClient(env.url, env.anonKey, accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user?.id) {
      console.error(
        "[createProject] getUser failed:",
        userError ? toPlainErrorMessage(userError) : "user null",
      );
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    // Tek kaynak: JWT'den doğrulanmış auth.uid()
    const authUid = user.id;
    console.info("[createProject] auth.uid():", authUid);

    const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
      supabase,
      authUid,
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
      created_by: authUid,
      owner_id: authUid,
    };

    let { error: insertError } = await supabase
      .from("projects")
      .insert(payload)
      .select("id")
      .single();

    if (
      insertError &&
      (toPlainErrorMessage(insertError).includes("owner_id") ||
        toPlainErrorMessage(insertError).includes("user_id"))
    ) {
      const withoutOwnerId = {
        name: payload.name,
        description: payload.description,
        workspace_id: payload.workspace_id,
        created_by: payload.created_by,
      };
      ({ error: insertError } = await supabase
        .from("projects")
        .insert(withoutOwnerId)
        .select("id")
        .single());
    }

    if (insertError) {
      console.error("[createProject] projects insert:", insertError);
      return {
        success: false,
        error: toPlainErrorMessage(insertError),
      };
    }

    shouldRevalidate = true;
  } catch (error) {
    // redirect()/NEXT_REDIRECT asla yutulmamalı
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("[createProject] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }

  // revalidatePath try dışında: beklenmeyen cache hataları sonucu bozmasın
  if (shouldRevalidate) {
    try {
      revalidatePath("/");
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.warn(
        "[createProject] revalidatePath uyarısı:",
        toPlainErrorMessage(error),
      );
    }
    return { success: true };
  }

  return {
    success: false,
    error: "Proje oluşturulurken beklenmeyen bir hata oluştu.",
  };
}

export const createProjectAction = createProject;
