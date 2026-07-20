"use server";

import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
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

/**
 * Anon key + kullanıcı JWT (Bearer). Service role burada KULLANILMAZ;
 * RLS politikaları auth.uid() üzerinden uygulanır.
 */
function createUserScopedClient(accessToken: string): SupabaseClient {
  const { url, anonKey } = getSupabaseEnv();
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
  user: User,
): Promise<{ workspaceId: string | null; error?: string }> {
  const userId = user.id;

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
      owner_id: userId,
    })
    .select("id")
    .single();

  if (workspaceError || !workspace?.id) {
    return {
      workspaceId: null,
      error: workspaceError?.message ?? "Çalışma alanı oluşturulamadı.",
    };
  }

  // Trigger (handle_new_workspace_owner_membership) genelde bu satırı ekler.
  // Yoksa veya race varsa: user_id === auth.uid() ile manuel INSERT.
  const memberPayload = {
    workspace_id: workspace.id,
    user_id: userId, // RLS: WITH CHECK (user_id = auth.uid())
    role: "Admin",
  };

  console.info("[createProject] workspace_members insert", {
    workspace_id: memberPayload.workspace_id,
    user_id: memberPayload.user_id,
    auth_uid_match: memberPayload.user_id === user.id,
  });

  const { error: memberError } = await supabase
    .from("workspace_members")
    .insert(memberPayload);

  if (memberError) {
    const msg = memberError.message.toLowerCase();
    const alreadyMember =
      msg.includes("duplicate") ||
      msg.includes("unique") ||
      memberError.code === "23505";

    if (!alreadyMember) {
      console.error("[createProject] workspace_members RLS/insert:", memberError);
      return {
        workspaceId: null,
        error:
          memberError.message +
          " — Supabase SQL Editor'de database/migrations/fix_workspace_members_rls.sql dosyasını çalıştırın.",
      };
    }
  }

  return { workspaceId: workspace.id as string };
}

export async function createProject(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
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

    // Yalnızca anon + JWT — service role karıştırılmaz
    const supabase = createUserScopedClient(accessToken);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user?.id) {
      console.error(
        "[createProject] Kullanıcı bulunamadı:",
        userError?.message ?? "user null",
      );
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    console.info("[createProject] Authenticated user (auth.uid):", user.id);

    const { workspaceId, error: workspaceError } = await resolveWorkspaceId(
      supabase,
      user,
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
      owner_id: user.id,
    };

    let { error: insertError } = await supabase
      .from("projects")
      .insert(payload)
      .select("id")
      .single();

    if (
      insertError?.message?.includes("owner_id") ||
      insertError?.message?.includes("user_id")
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

export const createProjectAction = createProject;
