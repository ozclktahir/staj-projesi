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
    const projectId = input.projectId?.trim() ?? "";
    const title = input.title?.trim() ?? "";

    if (!projectId) {
      return { success: false, error: "Proje kimliği zorunludur." };
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
      .select("id, workspace_id, created_by, owner_id, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      projectError?.message?.includes("owner_id") ||
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

    const ownsProject =
      project.created_by === authUid ||
      ("owner_id" in project && project.owner_id === authUid) ||
      ("user_id" in project && project.user_id === authUid);

    if (!ownsProject) {
      return {
        success: false,
        error: "Bu projeye görev ekleme yetkiniz yok.",
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

    const payload = {
      title,
      description,
      status,
      priority,
      project_id: projectId,
      workspace_id: workspaceId,
      created_by: authUid,
    };

    console.info("[createTask] insert", {
      project_id: payload.project_id,
      workspace_id: payload.workspace_id,
      created_by: payload.created_by,
      status: payload.status,
      priority: payload.priority,
    });

    const { error: insertError } = await supabase
      .from("tasks")
      .insert(payload)
      .select("id")
      .single();

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
