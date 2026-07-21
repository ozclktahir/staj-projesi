"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  TASK_STATUSES,
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

function isTaskStatus(value: unknown): value is TaskStatus {
  return (
    typeof value === "string" &&
    (TASK_STATUSES as string[]).includes(value)
  );
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<UpdateTaskStatusResult> {
  try {
    const id = taskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }
    if (!isTaskStatus(status)) {
      return { success: false, error: "Geçersiz görev durumu." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase } = auth;

    const { data, error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", id)
      .select("id, status, project_id")
      .maybeSingle();

    if (error) {
      console.error("[updateTaskStatus]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (!data) {
      return { success: false, error: "Görev bulunamadı veya erişim yok." };
    }

    const projectId =
      typeof data.project_id === "string" ? data.project_id : null;
    if (projectId) {
      revalidatePath(`/project/${projectId}`);
    }
    revalidatePath("/");
    revalidatePath("/projects");

    return { success: true, status: isTaskStatus(data.status) ? data.status : status };
  } catch (error) {
    console.error("[updateTaskStatus] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
