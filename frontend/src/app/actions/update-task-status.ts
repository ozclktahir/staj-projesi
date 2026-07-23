"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity-logger";
import {
  normalizeTaskStatusInput,
  taskStatusDbVariants,
  type TaskStatus,
} from "@/lib/supabase/types";

export type UpdateTaskStatusResult =
  | { success: true; status: TaskStatus }
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
    return "Görev durumu güncellenemedi.";
  }
}

export async function updateTaskStatus(
  taskId: string,
  status: string | TaskStatus,
): Promise<UpdateTaskStatusResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }

    const canonical = normalizeTaskStatusInput(status);
    if (!canonical) {
      console.error("[updateTaskStatus] invalid status input:", status);
      return {
        success: false,
        error: `Geçersiz görev durumu: ${String(status)}`,
      };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const variants = taskStatusDbVariants(canonical);

    const { data: before } = await supabase
      .from("tasks")
      .select("id, title, status, project_id, workspace_id")
      .eq("id", id)
      .maybeSingle();

    console.log("[updateTaskStatus] attempt", {
      taskId: id,
      input: status,
      canonical,
      variants,
    });

    let lastError: unknown = null;
    let updated: { id: string; status: string; project_id: string | null } | null =
      null;

    for (const candidate of variants) {
      const { data, error } = await supabase
        .from("tasks")
        .update({ status: candidate })
        .eq("id", id)
        .select("id, status, project_id")
        .maybeSingle();

      if (error) {
        console.error("[updateTaskStatus] update error for", candidate, {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        lastError = error;

        const msg = toPlainErrorMessage(error).toLowerCase();
        const enumMismatch =
          msg.includes("enum") ||
          msg.includes("invalid input") ||
          msg.includes("check") ||
          msg.includes("status");
        if (enumMismatch) {
          continue; // diğer yazımı dene
        }
        return { success: false, error: toPlainErrorMessage(error) };
      }

      if (data) {
        updated = {
          id: data.id as string,
          status: String(data.status),
          project_id:
            typeof data.project_id === "string" ? data.project_id : null,
        };
        console.log("[updateTaskStatus] success with variant", candidate, updated);
        break;
      }
    }

    if (!updated) {
      const message = lastError
        ? toPlainErrorMessage(lastError)
        : "Görev bulunamadı veya güncelleme yetkiniz yok (RLS).";
      console.error("[updateTaskStatus] no row updated:", message);
      return { success: false, error: message };
    }

    const projectId = updated.project_id;
    if (projectId) {
      revalidatePath(`/project/${projectId}`);
    }
    revalidatePath("/");
    revalidatePath("/dashboard");
    revalidatePath("/projects");
    revalidatePath("/my-tasks");

    const persisted =
      normalizeTaskStatusInput(updated.status) ?? canonical;

    const workspaceId =
      typeof before?.workspace_id === "string" ? before.workspace_id : null;
    const oldStatus =
      typeof before?.status === "string"
        ? normalizeTaskStatusInput(before.status)
        : null;

    if (workspaceId && oldStatus !== persisted) {
      await logActivity(supabase, {
        workspaceId,
        projectId:
          updated.project_id ??
          (typeof before?.project_id === "string" ? before.project_id : null),
        taskId: id,
        userId: user.id,
        actionType: "status_changed",
        details: {
          old_value: oldStatus ?? before?.status ?? null,
          new_value: persisted,
          task_title:
            typeof before?.title === "string" ? before.title : "görev",
        },
      });
    }

    return { success: true, status: persisted };
  } catch (error) {
    console.error("[updateTaskStatus] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
