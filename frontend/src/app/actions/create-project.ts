"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

export type CreateProjectInput = {
  name: string;
  description?: string;
  /** Aktif workspace — zorunlu; yoksa hata */
  workspaceId?: string | null;
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
  preferredWorkspaceId?: string | null,
): Promise<{ workspaceId: string | null; error?: string }> {
  const userId = authUserId;

  const { data: members, error: membersError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId);

  if (membersError) {
    return { workspaceId: null, error: toPlainErrorMessage(membersError) };
  }

  const memberIds = (members ?? [])
    .map((row) => row.workspace_id as string | undefined)
    .filter((id): id is string => Boolean(id));

  // Aktif workspace cookie/localStorage tercihini kullan
  if (
    preferredWorkspaceId &&
    memberIds.includes(preferredWorkspaceId)
  ) {
    return { workspaceId: preferredWorkspaceId };
  }

  const existingId = memberIds[0];
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
    console.log("[createProject] auth.uid():", authUid);
    console.log("[createProject] input.workspaceId:", input.workspaceId);

    const cookieWorkspaceRaw =
      cookieStore.get("active_workspace_id")?.value ?? null;
    let cookieWorkspaceId: string | null = null;
    if (cookieWorkspaceRaw) {
      try {
        cookieWorkspaceId = decodeURIComponent(cookieWorkspaceRaw).trim();
      } catch {
        cookieWorkspaceId = cookieWorkspaceRaw.trim();
      }
    }
    console.log("[createProject] cookie active_workspace_id:", cookieWorkspaceId);

    const requestedWorkspaceId =
      (typeof input.workspaceId === "string" && input.workspaceId.trim()) ||
      cookieWorkspaceId ||
      null;

    console.log(
      "[createProject] resolved requestedWorkspaceId:",
      requestedWorkspaceId,
    );

    if (!requestedWorkspaceId) {
      console.error("[createProject] workspace_id missing (null/undefined)");
      return {
        success: false,
        error: "Lütfen önce bir çalışma alanı seçin.",
      };
    }

    // Kullanıcının bu workspace üyesi olduğunu doğrula (otomatik yeni WS oluşturma yok)
    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", requestedWorkspaceId)
      .eq("user_id", authUid)
      .maybeSingle();

    if (membershipError) {
      console.error("[createProject] membership check:", membershipError);
      return {
        success: false,
        error: toPlainErrorMessage(membershipError),
      };
    }

    let workspaceId = membership?.workspace_id as string | undefined;

    if (!workspaceId) {
      // Owner olabilir ama members satırı eksik — workspaces.owner_id kontrolü
      const { data: owned, error: ownedError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", requestedWorkspaceId)
        .eq("owner_id", authUid)
        .maybeSingle();

      if (ownedError) {
        console.error("[createProject] owner check:", ownedError);
        return {
          success: false,
          error: toPlainErrorMessage(ownedError),
        };
      }

      if (!owned?.id) {
        console.error(
          "[createProject] not a member/owner of workspace:",
          requestedWorkspaceId,
        );
        return {
          success: false,
          error: "Lütfen önce bir çalışma alanı seçin.",
        };
      }

      workspaceId = owned.id as string;
      const { error: memberInsertError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: authUid,
          role: "Admin",
        });
      if (memberInsertError) {
        console.warn(
          "[createProject] workspace_members bootstrap:",
          memberInsertError,
        );
      }
    }

    // Şema: workspace_id zorunlu — asla null/undefined olmamalı
    const basePayload = {
      name,
      description,
      workspace_id: workspaceId as string,
      created_by: authUid,
      user_id: authUid,
    };

    if (
      basePayload.workspace_id == null ||
      basePayload.workspace_id === "" ||
      typeof basePayload.workspace_id !== "string"
    ) {
      console.error(
        "[createProject] payload.workspace_id invalid:",
        basePayload.workspace_id,
      );
      return {
        success: false,
        error: "Lütfen önce bir çalışma alanı seçin.",
      };
    }

    if (basePayload.user_id !== authUid || basePayload.created_by !== authUid) {
      return {
        success: false,
        error: "user_id / created_by, auth.uid() ile eşleşmiyor.",
      };
    }

    console.log("[createProject] projects insert payload", {
      name: basePayload.name,
      workspace_id: basePayload.workspace_id,
      created_by: basePayload.created_by,
      user_id: basePayload.user_id,
    });

    // 1) Tam payload (workspace_id + created_by + user_id)
    let { data: inserted, error: insertError } = await supabase
      .from("projects")
      .insert(basePayload)
      .select("id, workspace_id")
      .single();

    console.log("[createProject] insert attempt 1", {
      inserted,
      insertError: insertError
        ? {
            message: insertError.message,
            code: insertError.code,
            details: insertError.details,
            hint: insertError.hint,
          }
        : null,
    });

    // 2) created_by sütunu yoksa: yalnızca user_id (sahiplik)
    if (
      insertError &&
      toPlainErrorMessage(insertError).includes("created_by")
    ) {
      const userIdOnly = {
        name: basePayload.name,
        description: basePayload.description,
        workspace_id: basePayload.workspace_id,
        user_id: authUid,
      };
      ({ data: inserted, error: insertError } = await supabase
        .from("projects")
        .insert(userIdOnly)
        .select("id, workspace_id")
        .single());
      console.log("[createProject] insert attempt 2 (user_id only)", {
        inserted,
        error: insertError?.message,
      });
    }

    // 3) user_id sütunu yoksa (nadir): created_by ile dene
    if (
      insertError &&
      toPlainErrorMessage(insertError).includes("user_id")
    ) {
      const createdByOnly = {
        name: basePayload.name,
        description: basePayload.description,
        workspace_id: basePayload.workspace_id,
        created_by: authUid,
      };
      ({ data: inserted, error: insertError } = await supabase
        .from("projects")
        .insert(createdByOnly)
        .select("id, workspace_id")
        .single());
      console.log("[createProject] insert attempt 3 (created_by only)", {
        inserted,
        error: insertError?.message,
      });
    }

    if (insertError) {
      const message = toPlainErrorMessage(insertError);
      console.error("[createProject] projects insert FAILED:", {
        message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        payload: basePayload,
      });
      return {
        success: false,
        error: message,
      };
    }

    console.log("[createProject] success", inserted);
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
