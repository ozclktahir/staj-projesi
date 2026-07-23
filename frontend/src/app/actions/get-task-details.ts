"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

export type GetTaskDetailsResult =
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
    return "Görev detayı alınamadı.";
  }
}

function normalizeTaskPriority(value: unknown): TaskPriority {
  if (value === "LOW" || value === "HIGH" || value === "MEDIUM") {
    return value;
  }
  if (typeof value === "string") {
    const key = value.trim().toUpperCase();
    if (key === "LOW" || key === "HIGH" || key === "MEDIUM") return key;
  }
  return "MEDIUM";
}

export async function getTaskDetails(
  taskId: string,
): Promise<GetTaskDetailsResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) {
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

    let { data, error } = await supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      error?.message?.includes("deleted_at") ||
      error?.message?.includes("due_date") ||
      error?.message?.includes("assignee_id") ||
      error?.message?.includes("assigned_to")
    ) {
      ({ data, error } = await supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, project_id, workspace_id, created_at, created_by",
        )
        .eq("id", id)
        .maybeSingle());
    }

    if (error) {
      console.error("[getTaskDetails]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (!data) {
      return { success: false, error: "Görev bulunamadı veya erişim yok." };
    }

    const row = data as Record<string, unknown>;

    return {
      success: true,
      task: {
        id: row.id as string,
        title: (row.title as string) ?? "Adsız görev",
        description: (row.description as string | null) ?? null,
        status: (normalizeTaskStatusInput(row.status) ??
          "TODO") as TaskStatus,
        priority: normalizeTaskPriority(row.priority),
        project_id: (row.project_id as string | null) ?? null,
        workspace_id: (row.workspace_id as string | null) ?? null,
        due_date: (row.due_date as string | null) ?? null,
        parent_task_id: (row.parent_task_id as string | null) ?? null,
        assignee_id:
          (row.assignee_id as string | null | undefined) ??
          (row.assigned_to as string | null | undefined) ??
          null,
        created_at: (row.created_at as string | null) ?? null,
        created_by: (row.created_by as string | null) ?? null,
      },
    };
  } catch (error) {
    console.error("[getTaskDetails] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
