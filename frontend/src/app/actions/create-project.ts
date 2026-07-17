"use server";

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

    const supabase = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(accessToken);

    if (userError || !user) {
      console.error(
        "[createProject] Kullanıcı bulunamadı:",
        userError?.message ?? "user null",
      );
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
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
