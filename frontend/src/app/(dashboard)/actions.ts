"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CreateProjectInput = {
  name: string;
  description?: string;
};

export type CreateProjectResult =
  | { success: true }
  | { success: false; error: string };

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

export async function createProjectAction(
  input: CreateProjectInput,
): Promise<CreateProjectResult> {
  const name = input.name?.trim() ?? "";
  if (!name) {
    return { success: false, error: "Proje adı zorunludur." };
  }

  const description = input.description?.trim() || null;
  const { supabase, accessToken } = await createSupabaseServerClient();

  if (!accessToken) {
    return {
      success: false,
      error: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
    };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      success: false,
      error: "Kullanıcı doğrulanamadı. Lütfen tekrar giriş yapın.",
    };
  }

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
    return { success: false, error: insertError.message };
  }

  revalidatePath("/");
  return { success: true };
}
