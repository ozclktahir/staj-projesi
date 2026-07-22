"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import type { TaskAttachment } from "@/lib/supabase/types";
import {
  formatPersonName,
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";

export type GetAttachmentsResult =
  | { success: true; attachments: TaskAttachment[] }
  | { success: false; error: string };

export type CreateAttachmentResult =
  | { success: true; attachment: TaskAttachment }
  | { success: false; error: string };

export type DeleteAttachmentResult =
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
    return "Dosya işlemi başarısız.";
  }
}

function mapAttachment(
  row: Record<string, unknown>,
  uploaderName: string,
  currentUserId: string | null,
): TaskAttachment {
  const userId = (row.user_id as string | null) ?? null;
  const sizeRaw = row.file_size;
  const fileSize =
    sizeRaw === null || sizeRaw === undefined
      ? null
      : String(sizeRaw);

  return {
    id: row.id as string,
    task_id: row.task_id as string,
    user_id: userId,
    file_name: (row.file_name as string) ?? "dosya",
    file_url: (row.file_url as string) ?? "",
    file_size: fileSize,
    storage_path: (row.storage_path as string | null) ?? null,
    uploader_name: uploaderName,
    is_own: Boolean(userId && currentUserId && userId === currentUserId),
    created_at: (row.created_at as string | null) ?? null,
  };
}

async function enrichAttachments(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[],
  currentUserId: string | null,
): Promise<TaskAttachment[]> {
  if (!rows.length) return [];

  const userIds = [
    ...new Set(
      rows
        .map((r) => r.user_id)
        .filter((id): id is string => typeof id === "string"),
    ),
  ];

  const profileById =
    userIds.length > 0
      ? await loadProfilesByIds(supabase, userIds)
      : new Map<string, Record<string, unknown>>();

  return rows.map((row) => {
    const uid = typeof row.user_id === "string" ? row.user_id : null;
    const profile = uid ? profileById.get(uid) ?? null : null;
    const fields = resolveMemberDisplayFields(profile, null);
    const name = formatPersonName(profile, fields.email) || fields.displayName;
    return mapAttachment(row, name, currentUserId);
  });
}

export async function getTaskAttachments(
  taskId: string,
): Promise<GetAttachmentsResult> {
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

    const { supabase, user } = auth;

    const { data, error } = await supabase
      .from("task_attachments")
      .select(
        "id, task_id, user_id, file_name, file_url, file_size, storage_path, created_at",
      )
      .eq("task_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getTaskAttachments]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    return {
      success: true,
      attachments: await enrichAttachments(
        supabase,
        (data ?? []) as Record<string, unknown>[],
        user.id,
      ),
    };
  } catch (error) {
    console.error("[getTaskAttachments] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function createTaskAttachment(input: {
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number | string | null;
  storagePath?: string | null;
}): Promise<CreateAttachmentResult> {
  try {
    const taskId = input.taskId?.trim() ?? "";
    const fileName = input.fileName?.trim() ?? "";
    const fileUrl = input.fileUrl?.trim() ?? "";

    if (!taskId) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }
    if (!fileName || !fileUrl) {
      return { success: false, error: "Dosya adı ve URL zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;

    const { data: task } = await supabase
      .from("tasks")
      .select("id, project_id")
      .eq("id", taskId)
      .maybeSingle();

    const fileSize =
      input.fileSize === null || input.fileSize === undefined
        ? null
        : String(input.fileSize);

    const { data, error } = await supabase
      .from("task_attachments")
      .insert({
        task_id: taskId,
        user_id: user.id,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
        storage_path: input.storagePath?.trim() || null,
      })
      .select(
        "id, task_id, user_id, file_name, file_url, file_size, storage_path, created_at",
      )
      .single();

    if (error || !data) {
      console.error("[createTaskAttachment]", error);
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Dosya kaydı oluşturulamadı."),
      };
    }

    if (typeof task?.project_id === "string") {
      revalidatePath(`/project/${task.project_id}`);
    }

    const profile =
      (await loadProfilesByIds(supabase, [user.id])).get(user.id) ?? null;
    const fields = resolveMemberDisplayFields(profile, user.email ?? null);
    const name =
      formatPersonName(profile, user.email ?? null) || fields.displayName;

    return {
      success: true,
      attachment: mapAttachment(
        data as Record<string, unknown>,
        name,
        user.id,
      ),
    };
  } catch (error) {
    console.error("[createTaskAttachment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function deleteTaskAttachment(
  attachmentId: string,
): Promise<DeleteAttachmentResult> {
  try {
    const id = attachmentId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Dosya kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;

    const { data: existing, error: fetchError } = await supabase
      .from("task_attachments")
      .select("id, user_id, storage_path, task_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (fetchError) {
      return { success: false, error: toPlainErrorMessage(fetchError) };
    }
    if (!existing) {
      return {
        success: false,
        error: "Dosya bulunamadı veya silme yetkiniz yok.",
      };
    }

    if (
      typeof existing.storage_path === "string" &&
      existing.storage_path.trim()
    ) {
      const { error: storageError } = await supabase.storage
        .from("task-attachments")
        .remove([existing.storage_path.trim()]);
      if (storageError) {
        console.warn(
          "[deleteTaskAttachment] storage remove:",
          storageError.message,
        );
      }
    }

    const { error } = await supabase
      .from("task_attachments")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: toPlainErrorMessage(error) };
    }

    return { success: true };
  } catch (error) {
    console.error("[deleteTaskAttachment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function uploadTaskAttachment(
  formData: FormData,
): Promise<CreateAttachmentResult> {
  try {
    const taskId = String(formData.get("taskId") ?? "").trim();
    const file = formData.get("file");

    if (!taskId) {
      return { success: false, error: "Görev kimliği zorunludur." };
    }
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "Geçerli bir dosya seçin." };
    }
    if (file.size > 25 * 1024 * 1024) {
      return { success: false, error: "Dosya boyutu 25 MB sınırını aşıyor." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const safeName = file.name.replace(/[^\w.\-()+\s]/gi, "_").slice(0, 120);
    const storagePath = `${user.id}/${taskId}/${crypto.randomUUID()}-${safeName}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from("task-attachments")
      .upload(storagePath, bytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("[uploadTaskAttachment] storage:", uploadError);
      return { success: false, error: toPlainErrorMessage(uploadError) };
    }

    const { data: publicData } = supabase.storage
      .from("task-attachments")
      .getPublicUrl(storagePath);

    return createTaskAttachment({
      taskId,
      fileName: file.name,
      fileUrl: publicData.publicUrl,
      fileSize: file.size,
      storagePath,
    });
  } catch (error) {
    console.error("[uploadTaskAttachment] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
