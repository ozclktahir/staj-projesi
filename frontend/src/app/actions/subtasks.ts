"use server";

import { revalidatePath } from "next/cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type Subtask,
  type TaskStatus,
} from "@/lib/supabase/types";

export type SubtaskResult =
  | { success: true; subtask: Subtask }
  | { success: false; error: string };

export type SubtasksListResult =
  | { success: true; subtasks: Subtask[] }
  | { success: false; error: string };

export type SimpleResult =
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
    return "Alt görev işlemi başarısız.";
  }
}

function mapSubtask(row: Record<string, unknown>): Subtask {
  const status = (normalizeTaskStatusInput(row.status) ?? "TODO") as TaskStatus;
  return {
    id: row.id as string,
    title: (row.title as string) ?? "Alt görev",
    status,
    parent_task_id: row.parent_task_id as string,
    done: status === "DONE",
  };
}

export async function getSubtasks(
  parentTaskId: string,
): Promise<SubtasksListResult> {
  try {
    const id = parentTaskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Ana görev kimliği zorunludur." };
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
      .select("id, title, status, parent_task_id")
      .eq("parent_task_id", id)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error?.message?.includes("deleted_at")) {
      ({ data, error } = await supabase
        .from("tasks")
        .select("id, title, status, parent_task_id")
        .eq("parent_task_id", id)
        .order("created_at", { ascending: true }));
    }

    if (error) {
      console.error("[getSubtasks]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    return {
      success: true,
      subtasks: (data ?? []).map((row) =>
        mapSubtask(row as Record<string, unknown>),
      ),
    };
  } catch (error) {
    console.error("[getSubtasks] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function createSubtask(
  parentTaskId: string,
  title: string,
): Promise<SubtaskResult> {
  try {
    const parentId = parentTaskId?.trim() ?? "";
    const cleanTitle = title?.trim() ?? "";
    if (!parentId) {
      return { success: false, error: "Ana görev kimliği zorunludur." };
    }
    if (!cleanTitle) {
      return { success: false, error: "Alt görev başlığı zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;

    const { data: parent, error: parentError } = await supabase
      .from("tasks")
      .select("id, project_id, workspace_id")
      .eq("id", parentId)
      .maybeSingle();

    if (parentError || !parent) {
      console.error("[createSubtask] parent:", parentError);
      return {
        success: false,
        error: toPlainErrorMessage(parentError ?? "Ana görev bulunamadı."),
      };
    }

    const payload: Record<string, unknown> = {
      title: cleanTitle,
      status: "TODO",
      priority: "MEDIUM",
      parent_task_id: parentId,
      project_id: parent.project_id,
      workspace_id: parent.workspace_id,
      created_by: user.id,
      user_id: user.id,
      description: null,
    };

    console.log("[createSubtask] insert", {
      parent_task_id: parentId,
      title: cleanTitle,
    });

    let { data, error } = await supabase
      .from("tasks")
      .insert(payload)
      .select("id, title, status, parent_task_id")
      .single();

    if (error?.message?.includes("user_id")) {
      const { user_id: _u, ...withoutUserId } = payload;
      ({ data, error } = await supabase
        .from("tasks")
        .insert(withoutUserId)
        .select("id, title, status, parent_task_id")
        .single());
    }

    if (error) {
      console.error("[createSubtask]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (typeof parent.project_id === "string") {
      revalidatePath(`/project/${parent.project_id}`);
    }
    revalidatePath("/");

    return {
      success: true,
      subtask: mapSubtask(data as Record<string, unknown>),
    };
  } catch (error) {
    console.error("[createSubtask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function toggleSubtask(
  subtaskId: string,
): Promise<SubtaskResult> {
  try {
    const id = subtaskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Alt görev kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase } = auth;

    const { data: existing, error: fetchError } = await supabase
      .from("tasks")
      .select("id, title, status, parent_task_id, project_id")
      .eq("id", id)
      .maybeSingle();

    if (fetchError || !existing?.parent_task_id) {
      console.error("[toggleSubtask] fetch:", fetchError);
      return {
        success: false,
        error: toPlainErrorMessage(
          fetchError ?? "Alt görev bulunamadı.",
        ),
      };
    }

    const current = normalizeTaskStatusInput(existing.status) ?? "TODO";
    const nextStatus: TaskStatus = current === "DONE" ? "TODO" : "DONE";

    const { data, error } = await supabase
      .from("tasks")
      .update({ status: nextStatus })
      .eq("id", id)
      .select("id, title, status, parent_task_id")
      .maybeSingle();

    if (error || !data) {
      console.error("[toggleSubtask] update:", error);
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Durum güncellenemedi."),
      };
    }

    if (typeof existing.project_id === "string") {
      revalidatePath(`/project/${existing.project_id}`);
    }
    revalidatePath("/");

    return {
      success: true,
      subtask: mapSubtask(data as Record<string, unknown>),
    };
  } catch (error) {
    console.error("[toggleSubtask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function deleteSubtask(subtaskId: string): Promise<SimpleResult> {
  try {
    const id = subtaskId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Alt görev kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase } = auth;

    const { data: existing } = await supabase
      .from("tasks")
      .select("id, parent_task_id, project_id")
      .eq("id", id)
      .maybeSingle();

    if (!existing?.parent_task_id) {
      return { success: false, error: "Alt görev bulunamadı." };
    }

    // Soft delete tercih; sütun yoksa hard delete
    let { error } = await supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error?.message?.includes("deleted_at")) {
      ({ error } = await supabase.from("tasks").delete().eq("id", id));
    }

    if (error) {
      console.error("[deleteSubtask]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    if (typeof existing.project_id === "string") {
      revalidatePath(`/project/${existing.project_id}`);
    }
    revalidatePath("/");

    return { success: true };
  } catch (error) {
    console.error("[deleteSubtask] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
