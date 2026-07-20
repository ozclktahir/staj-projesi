"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

export type CreateTaskInput = {
  projectId: string;
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
};

export type CreateTaskResult =
  | { success: true }
  | { success: false; error: string };

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
    return "Görev oluşturulurken beklenmeyen bir hata oluştu.";
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

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as string[]).includes(value)
  );
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" &&
    (TASK_PRIORITIES as string[]).includes(value)
  );
}

export async function createTask(
  input: CreateTaskInput,
): Promise<CreateTaskResult> {
  let shouldRevalidate = false;
  let projectIdForRevalidate = "";

  try {
    // project_id zorunlu — RLS INSERT politikası projects.user_id +
    // workspace_members ilişkisine bağlıdır.
    const projectId = input.projectId?.trim() ?? "";
    const title = input.title?.trim() ?? "";

    if (!projectId) {
      return { success: false, error: "Proje kimliği (project_id) zorunludur." };
    }
    if (!title) {
      return { success: false, error: "Görev başlığı zorunludur." };
    }

    const status: TaskStatus = isTaskStatus(input.status)
      ? input.status
      : "TODO";
    const priority: TaskPriority = isTaskPriority(input.priority)
      ? input.priority
      : "MEDIUM";
    const description = input.description?.trim() || null;

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const authUid = user.id;

    let { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, workspace_id, created_by, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      projectError?.message?.includes("user_id") ||
      projectError?.message?.includes("deleted_at")
    ) {
      ({ data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, workspace_id, created_by")
        .eq("id", projectId)
        .maybeSingle());
    }

    if (projectError || !project) {
      return {
        success: false,
        error: toPlainErrorMessage(
          projectError ?? "Proje bulunamadı veya erişim yok.",
        ),
      };
    }

    const workspaceId =
      typeof project.workspace_id === "string" ? project.workspace_id : null;

    if (!workspaceId) {
      return {
        success: false,
        error: "Projenin workspace_id bilgisi bulunamadı.",
      };
    }

    // RLS ile uyumlu: proje sahibi veya workspace üyesi
    const ownsProject =
      ("user_id" in project && project.user_id === authUid) ||
      project.created_by === authUid;

    const { data: membership, error: membershipError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", authUid)
      .maybeSingle();

    if (membershipError) {
      console.warn(
        "[createTask] workspace_members check:",
        toPlainErrorMessage(membershipError),
      );
    }

    const isWorkspaceMember = Boolean(membership?.workspace_id);

    if (!ownsProject && !isWorkspaceMember) {
      return {
        success: false,
        error: "Bu projeye görev ekleme yetkiniz yok.",
      };
    }

    // Zorunlu: project_id
    // created_by / user_id varsa auth.uid() ile doldurulur (RLS WITH CHECK)
    const basePayload = {
      title,
      description,
      status,
      priority,
      project_id: projectId,
      workspace_id: workspaceId,
      created_by: authUid,
      user_id: authUid,
    };

    if (!basePayload.project_id) {
      return { success: false, error: "Proje kimliği (project_id) zorunludur." };
    }
    if (
      basePayload.created_by !== authUid ||
      basePayload.user_id !== authUid
    ) {
      return {
        success: false,
        error: "created_by / user_id, auth.uid() ile eşleşmiyor.",
      };
    }

    console.info("[createTask] insert", {
      project_id: basePayload.project_id,
      workspace_id: basePayload.workspace_id,
      created_by: basePayload.created_by,
      user_id: basePayload.user_id,
      status: basePayload.status,
      priority: basePayload.priority,
    });

    // 1) Tam payload (project_id + created_by + user_id)
    let { error: insertError } = await supabase
      .from("tasks")
      .insert(basePayload)
      .select("id")
      .single();

    // 2) user_id sütunu yoksa: created_by ile dene
    if (
      insertError &&
      toPlainErrorMessage(insertError).includes("user_id")
    ) {
      const withoutUserId = {
        title: basePayload.title,
        description: basePayload.description,
        status: basePayload.status,
        priority: basePayload.priority,
        project_id: basePayload.project_id,
        workspace_id: basePayload.workspace_id,
        created_by: authUid,
      };
      ({ error: insertError } = await supabase
        .from("tasks")
        .insert(withoutUserId)
        .select("id")
        .single());
    }

    // 3) created_by sütunu yoksa: user_id ile dene
    if (
      insertError &&
      toPlainErrorMessage(insertError).includes("created_by")
    ) {
      const withoutCreatedBy = {
        title: basePayload.title,
        description: basePayload.description,
        status: basePayload.status,
        priority: basePayload.priority,
        project_id: basePayload.project_id,
        workspace_id: basePayload.workspace_id,
        user_id: authUid,
      };
      ({ error: insertError } = await supabase
        .from("tasks")
        .insert(withoutCreatedBy)
        .select("id")
        .single());
    }

    if (insertError) {
      console.error("[createTask] insert:", insertError);
      return { success: false, error: toPlainErrorMessage(insertError) };
    }

    shouldRevalidate = true;
    projectIdForRevalidate = projectId;
  } catch (error) {
    if (isNextRedirectError(error)) {
      throw error;
    }
    console.error("[createTask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }

  if (shouldRevalidate) {
    try {
      revalidatePath(`/project/${projectIdForRevalidate}`);
      revalidatePath("/");
    } catch (error) {
      if (isNextRedirectError(error)) {
        throw error;
      }
      console.warn(
        "[createTask] revalidatePath uyarısı:",
        toPlainErrorMessage(error),
      );
    }
    return { success: true };
  }

  return {
    success: false,
    error: "Görev oluşturulurken beklenmeyen bir hata oluştu.",
  };
}
