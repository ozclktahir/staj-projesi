"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import {
  getMemberVisibleProjectIds,
  resolveWorkspaceRole,
} from "@/lib/workspace-permissions";
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
  /** Atanan kullanıcı (workspace üyesi) */
  assigneeId?: string | null;
};

export type CreateTaskResult =
  | { success: true }
  | { success: false; error: string };

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
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
    typeof value === "string" && (TASK_STATUSES as string[]).includes(value)
  );
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return (
    typeof value === "string" && (TASK_PRIORITIES as string[]).includes(value)
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
      .select("id, workspace_id, created_by, user_id, assigned_to")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      projectError?.message?.includes("user_id") ||
      projectError?.message?.includes("deleted_at") ||
      projectError?.message?.includes("assigned_to")
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

    const roleCtx = await resolveWorkspaceRole(supabase, workspaceId, authUid);

    if (!roleCtx.role && !roleCtx.isOwner) {
      return {
        success: false,
        error: "Bu workspace üyesi değilsiniz.",
      };
    }

    // MEMBER: yalnızca görünür (atanmış) projelere görev ekleyebilir
    if (!roleCtx.isAdmin) {
      const visible = await getMemberVisibleProjectIds(
        supabase,
        workspaceId,
        authUid,
      );
      if (!visible.includes(projectId)) {
        return {
          success: false,
          error: "Bu projeye görev ekleme yetkiniz yok.",
        };
      }
    }

    let assigneeId =
      typeof input.assigneeId === "string" && input.assigneeId.trim()
        ? input.assigneeId.trim()
        : null;

    if (!roleCtx.isAdmin) {
      // Member yalnızca kendine atayabilir
      assigneeId = authUid;
    } else if (assigneeId) {
      const { data: assigneeMember } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", assigneeId)
        .maybeSingle();

      const { data: ownerRow } = await supabase
        .from("workspaces")
        .select("id")
        .eq("id", workspaceId)
        .eq("owner_id", assigneeId)
        .maybeSingle();

      if (!assigneeMember && !ownerRow) {
        return {
          success: false,
          error: "Atanan kişi bu workspace üyesi olmalıdır.",
        };
      }
    }

    const basePayload: Record<string, unknown> = {
      title,
      description,
      status,
      priority,
      project_id: projectId,
      workspace_id: workspaceId,
      created_by: authUid,
      user_id: authUid,
    };

    if (assigneeId) {
      basePayload.assignee_id = assigneeId;
      basePayload.assigned_to = assigneeId;
    }

    console.info("[createTask] insert", {
      project_id: projectId,
      workspace_id: workspaceId,
      assignee_id: assigneeId,
      isAdmin: roleCtx.isAdmin,
    });

    let insertedId: string | null = null;
    let { data: inserted, error: insertError } = await supabase
      .from("tasks")
      .insert(basePayload)
      .select("id")
      .single();

    // Sütun uyumluluk fallback'leri
    if (
      insertError &&
      (toPlainErrorMessage(insertError).includes("assigned_to") ||
        toPlainErrorMessage(insertError).includes("assignee_id"))
    ) {
      const retry = { ...basePayload };
      if (toPlainErrorMessage(insertError).includes("assigned_to")) {
        delete retry.assigned_to;
      }
      if (toPlainErrorMessage(insertError).includes("assignee_id")) {
        delete retry.assignee_id;
      }
      ({ data: inserted, error: insertError } = await supabase
        .from("tasks")
        .insert(retry)
        .select("id")
        .single());
    }

    if (
      insertError &&
      toPlainErrorMessage(insertError).includes("user_id")
    ) {
      const { user_id: _u, ...withoutUserId } = basePayload;
      ({ data: inserted, error: insertError } = await supabase
        .from("tasks")
        .insert(withoutUserId)
        .select("id")
        .single());
    }

    if (insertError) {
      console.error("[createTask] insert:", insertError);
      return { success: false, error: toPlainErrorMessage(insertError) };
    }

    insertedId =
      inserted && typeof inserted.id === "string" ? inserted.id : null;

    if (insertedId) {
      await logActivity(supabase, {
        workspaceId,
        projectId,
        taskId: insertedId,
        userId: authUid,
        actionType: "task_created",
        details: {
          task_title: title,
          status,
          priority,
          assignee_id: assigneeId,
        },
      });
    }

    shouldRevalidate = true;
    projectIdForRevalidate = projectId;
  } catch (error) {
    if (isNextRedirectError(error)) throw error;
    console.error("[createTask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }

  if (shouldRevalidate) {
    try {
      revalidatePath(`/project/${projectIdForRevalidate}`);
      revalidatePath("/");
    } catch (error) {
      if (isNextRedirectError(error)) throw error;
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
