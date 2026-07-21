"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  TASK_PRIORITIES,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

export type UpdateTaskInput = {
  taskId: string;
  title?: string;
  description?: string | null;
  due_date?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus | string;
};

export type UpdateTaskResult =
  | { success: true; task: ProjectTask }
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
    return "Görev güncellenemedi.";
  }
}

function normalizePriority(value: unknown): TaskPriority | null {
  if (
    typeof value === "string" &&
    (TASK_PRIORITIES as string[]).includes(value.toUpperCase())
  ) {
    return value.toUpperCase() as TaskPriority;
  }
  return null;
}

export async function updateTask(
  input: UpdateTaskInput,
): Promise<UpdateTaskResult> {
  try {
    const taskId = input.taskId?.trim() ?? "";
    if (!taskId) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase } = auth;
    const patch: Record<string, unknown> = {};

    if (typeof input.title === "string") {
      const title = input.title.trim();
      if (!title) {
        return { success: false, error: "Başlık boş olamaz." };
      }
      patch.title = title;
    }

    if (input.description !== undefined) {
      patch.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    if (input.due_date !== undefined) {
      patch.due_date = input.due_date?.trim() || null;
    }

    if (input.priority !== undefined) {
      const priority = normalizePriority(input.priority);
      if (!priority) {
        return { success: false, error: "Geçersiz öncelik." };
      }
      patch.priority = priority;
    }

    if (input.status !== undefined) {
      const status = normalizeTaskStatusInput(input.status);
      if (!status) {
        return { success: false, error: "Geçersiz durum." };
      }
      patch.status = status;
    }

    if (Object.keys(patch).length === 0) {
      return { success: false, error: "Güncellenecek alan yok." };
    }

    console.log("[updateTask] patch", { taskId, patch });

    let { data, error } = await supabase
      .from("tasks")
      .update(patch)
      .eq("id", taskId)
      .select(
        "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by",
      )
      .maybeSingle();

    if (error?.message?.includes("due_date")) {
      const { due_date: _omit, ...withoutDue } = patch;
      ({ data, error } = await supabase
        .from("tasks")
        .update(withoutDue)
        .eq("id", taskId)
        .select(
          "id, title, description, status, priority, project_id, workspace_id, created_at, created_by",
        )
        .maybeSingle());
    }

    if (error) {
      console.error("[updateTask]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (!data) {
      return {
        success: false,
        error: "Görev bulunamadı veya güncelleme yetkiniz yok.",
      };
    }

    const projectId =
      typeof data.project_id === "string" ? data.project_id : null;
    if (projectId) revalidatePath(`/project/${projectId}`);
    revalidatePath("/");
    revalidatePath("/dashboard");

    return {
      success: true,
      task: {
        id: data.id as string,
        title: (data.title as string) ?? "Adsız görev",
        description: (data.description as string | null) ?? null,
        status: (normalizeTaskStatusInput(data.status) ?? "TODO") as TaskStatus,
        priority: (normalizePriority(data.priority) ?? "MEDIUM") as TaskPriority,
        project_id: (data.project_id as string | null) ?? null,
        workspace_id: (data.workspace_id as string | null) ?? null,
        due_date:
          "due_date" in data
            ? ((data.due_date as string | null) ?? null)
            : null,
        parent_task_id:
          "parent_task_id" in data
            ? ((data.parent_task_id as string | null) ?? null)
            : null,
        created_at: (data.created_at as string | null) ?? null,
        created_by: (data.created_by as string | null) ?? null,
      },
    };
  } catch (error) {
    console.error("[updateTask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
