"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

export type GetTaskDetailsResult =
  | { success: true; task: ProjectTask }
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
    return "Görev detayı alınamadı.";
  }
}

function normalizeTaskStatus(value: unknown): TaskStatus {
  if (value === "TODO" || value === "IN_PROGRESS" || value === "DONE") {
    return value;
  }
  return "TODO";
}

function normalizeTaskPriority(value: unknown): TaskPriority {
  if (value === "LOW" || value === "HIGH" || value === "MEDIUM") {
    return value;
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
        "id, title, description, status, priority, project_id, workspace_id, created_at, created_by",
      )
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error?.message?.includes("deleted_at")) {
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

    return {
      success: true,
      task: {
        id: data.id as string,
        title: (data.title as string) ?? "Adsız görev",
        description: (data.description as string | null) ?? null,
        status: normalizeTaskStatus(data.status),
        priority: normalizeTaskPriority(data.priority),
        project_id: (data.project_id as string | null) ?? null,
        workspace_id: (data.workspace_id as string | null) ?? null,
        created_at: (data.created_at as string | null) ?? null,
        created_by: (data.created_by as string | null) ?? null,
      },
    };
  } catch (error) {
    console.error("[getTaskDetails] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
