"use server";

import { revalidatePath } from "next/cache";
import { logActionError } from "@/lib/action-result";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export type PersonalNote = {
  id: string;
  title: string;
  content: string;
  taskId: string | null;
  taskTitle: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type PersonalTodo = {
  id: string;
  task: string;
  dueDate: string | null;
  isCompleted: boolean;
  createdAt: string | null;
};

export type PersonalFile = {
  id: string;
  fileName: string;
  fileUrl: string;
  storagePath: string | null;
  fileSize: number | null;
  createdAt: string | null;
};

type SimpleResult = { success: true } | { success: false; error: string };

function revalidatePersonal() {
  revalidatePath("/personal");
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export async function getPersonalNotes(): Promise<{
  success: boolean;
  notes: PersonalNote[];
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, notes: [], error: "Oturum bulunamadı." };
    }

    const primary = await auth.supabase
      .from("personal_notes")
      .select("id, title, content, task_id, created_at, updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    let rows: Array<Record<string, unknown>> =
      (primary.data as Array<Record<string, unknown>> | null) ?? [];
    let error = primary.error;

    if (error && /task_id/i.test(error.message)) {
      const fallback = await auth.supabase
        .from("personal_notes")
        .select("id, title, content, created_at, updated_at")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false });
      rows = (fallback.data as Array<Record<string, unknown>> | null) ?? [];
      error = fallback.error;
    }

    if (error) {
      console.error("[getPersonalNotes]", error.message);
      return {
        success: false,
        notes: [],
        error: "Notlar getirilirken bir hata oluştu.",
      };
    }

    const taskIds = [
      ...new Set(
        rows
          .map((row) =>
            typeof row.task_id === "string" ? row.task_id : null,
          )
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    const taskTitleById = new Map<string, string>();
    if (taskIds.length > 0) {
      const { data: tasks } = await auth.supabase
        .from("tasks")
        .select("id, title")
        .in("id", taskIds);
      for (const task of tasks ?? []) {
        if (typeof task.id === "string") {
          taskTitleById.set(
            task.id,
            (typeof task.title === "string" && task.title) || "Görev",
          );
        }
      }
    }

    const notes: PersonalNote[] = rows.map((row) => {
      const taskId =
        typeof row.task_id === "string" ? row.task_id : null;
      return {
        id: String(row.id),
        title: String(row.title ?? ""),
        content: String(row.content ?? ""),
        taskId,
        taskTitle: taskId ? (taskTitleById.get(taskId) ?? null) : null,
        createdAt: (row.created_at as string | null) ?? null,
        updatedAt: (row.updated_at as string | null) ?? null,
      };
    });

    return { success: true, notes };
  } catch (error) {
    return {
      success: false,
      notes: [],
      error: logActionError(
        "getPersonalNotes",
        error,
        "Notlar getirilirken bir hata oluştu.",
      ),
    };
  }
}

export async function createPersonalNote(input: {
  title: string;
  content: string;
  taskId?: string | null;
}): Promise<{ success: true; note: PersonalNote } | { success: false; error: string }> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const title = input.title?.trim() || "Başlıksız not";
    const content = input.content?.trim() ?? "";
    const taskId = input.taskId?.trim() || null;

    const { data, error } = await auth.supabase
      .from("personal_notes")
      .insert({
        user_id: auth.user.id,
        title,
        content,
        task_id: taskId,
      })
      .select("id, title, content, task_id, created_at, updated_at")
      .single();

    if (error || !data) {
      console.error("[createPersonalNote]", error?.message);
      return { success: false, error: "Not oluşturulamadı." };
    }

    let taskTitle: string | null = null;
    if (taskId) {
      const { data: task } = await auth.supabase
        .from("tasks")
        .select("title")
        .eq("id", taskId)
        .maybeSingle();
      taskTitle =
        typeof task?.title === "string" && task.title.trim()
          ? task.title.trim()
          : "Görev";
    }

    revalidatePersonal();
    return {
      success: true,
      note: {
        id: String(data.id),
        title: String(data.title ?? title),
        content: String(data.content ?? content),
        taskId: (data.task_id as string | null) ?? null,
        taskTitle,
        createdAt: (data.created_at as string | null) ?? null,
        updatedAt: (data.updated_at as string | null) ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "createPersonalNote",
        error,
        "Not oluşturulurken bir hata oluştu.",
      ),
    };
  }
}

export async function updatePersonalNote(input: {
  id: string;
  title: string;
  content: string;
  taskId?: string | null;
}): Promise<SimpleResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const id = input.id?.trim();
    if (!id) return { success: false, error: "Not kimliği zorunludur." };

    const taskId =
      input.taskId === undefined
        ? undefined
        : input.taskId?.trim() || null;

    const payload: Record<string, unknown> = {
      title: input.title?.trim() || "Başlıksız not",
      content: input.content?.trim() ?? "",
      updated_at: new Date().toISOString(),
    };
    if (taskId !== undefined) {
      payload.task_id = taskId;
    }

    const { error } = await auth.supabase
      .from("personal_notes")
      .update(payload)
      .eq("id", id)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[updatePersonalNote]", error.message);
      return { success: false, error: "Not güncellenemedi." };
    }

    revalidatePersonal();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "updatePersonalNote",
        error,
        "Not güncellenirken bir hata oluştu.",
      ),
    };
  }
}

export async function deletePersonalNote(id: string): Promise<SimpleResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const noteId = id?.trim();
    if (!noteId) return { success: false, error: "Not kimliği zorunludur." };

    const { error } = await auth.supabase
      .from("personal_notes")
      .delete()
      .eq("id", noteId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[deletePersonalNote]", error.message);
      return { success: false, error: "Not silinemedi." };
    }

    revalidatePersonal();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "deletePersonalNote",
        error,
        "Not silinirken bir hata oluştu.",
      ),
    };
  }
}

// ─── Todos ───────────────────────────────────────────────────────────────────

export async function getPersonalTodos(): Promise<{
  success: boolean;
  todos: PersonalTodo[];
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, todos: [], error: "Oturum bulunamadı." };
    }

    const { data, error } = await auth.supabase
      .from("personal_todos")
      .select("id, task, due_date, is_completed, created_at")
      .eq("user_id", auth.user.id)
      .order("is_completed", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getPersonalTodos]", error.message);
      return {
        success: false,
        todos: [],
        error: "Yapılacaklar getirilirken bir hata oluştu.",
      };
    }

    const todos: PersonalTodo[] = (data ?? []).map((row) => ({
      id: String(row.id),
      task: String(row.task ?? ""),
      dueDate: (row.due_date as string | null) ?? null,
      isCompleted: Boolean(row.is_completed),
      createdAt: (row.created_at as string | null) ?? null,
    }));

    return { success: true, todos };
  } catch (error) {
    return {
      success: false,
      todos: [],
      error: logActionError(
        "getPersonalTodos",
        error,
        "Yapılacaklar getirilirken bir hata oluştu.",
      ),
    };
  }
}

export async function createPersonalTodo(input: {
  task: string;
  dueDate?: string | null;
}): Promise<{ success: true; todo: PersonalTodo } | { success: false; error: string }> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const task = input.task?.trim();
    if (!task) {
      return { success: false, error: "Görev metni zorunludur." };
    }

    const dueDate = input.dueDate?.trim() || null;

    const { data, error } = await auth.supabase
      .from("personal_todos")
      .insert({
        user_id: auth.user.id,
        task,
        due_date: dueDate,
        is_completed: false,
      })
      .select("id, task, due_date, is_completed, created_at")
      .single();

    if (error || !data) {
      console.error("[createPersonalTodo]", error?.message);
      return { success: false, error: "Görev eklenemedi." };
    }

    revalidatePersonal();
    return {
      success: true,
      todo: {
        id: String(data.id),
        task: String(data.task ?? task),
        dueDate: (data.due_date as string | null) ?? null,
        isCompleted: Boolean(data.is_completed),
        createdAt: (data.created_at as string | null) ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "createPersonalTodo",
        error,
        "Görev eklenirken bir hata oluştu.",
      ),
    };
  }
}

export async function togglePersonalTodo(
  id: string,
  isCompleted: boolean,
): Promise<SimpleResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const todoId = id?.trim();
    if (!todoId) return { success: false, error: "Görev kimliği zorunludur." };

    const { error } = await auth.supabase
      .from("personal_todos")
      .update({ is_completed: isCompleted })
      .eq("id", todoId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[togglePersonalTodo]", error.message);
      return { success: false, error: "Görev güncellenemedi." };
    }

    revalidatePersonal();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "togglePersonalTodo",
        error,
        "Görev güncellenirken bir hata oluştu.",
      ),
    };
  }
}

export async function deletePersonalTodo(id: string): Promise<SimpleResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const todoId = id?.trim();
    if (!todoId) return { success: false, error: "Görev kimliği zorunludur." };

    const { error } = await auth.supabase
      .from("personal_todos")
      .delete()
      .eq("id", todoId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[deletePersonalTodo]", error.message);
      return { success: false, error: "Görev silinemedi." };
    }

    revalidatePersonal();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "deletePersonalTodo",
        error,
        "Görev silinirken bir hata oluştu.",
      ),
    };
  }
}

// ─── Files ───────────────────────────────────────────────────────────────────

export async function getPersonalFiles(): Promise<{
  success: boolean;
  files: PersonalFile[];
  error?: string;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, files: [], error: "Oturum bulunamadı." };
    }

    const { data, error } = await auth.supabase
      .from("personal_files")
      .select("id, file_name, file_url, storage_path, file_size, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getPersonalFiles]", error.message);
      return {
        success: false,
        files: [],
        error: "Dosyalar getirilirken bir hata oluştu.",
      };
    }

    const files: PersonalFile[] = [];
    for (const row of data ?? []) {
      let fileUrl = String(row.file_url ?? "");
      const storagePath =
        typeof row.storage_path === "string" ? row.storage_path : null;

      if (storagePath) {
        const { data: signed } = await auth.supabase.storage
          .from("personal-files")
          .createSignedUrl(storagePath, 60 * 60);
        if (signed?.signedUrl) {
          fileUrl = signed.signedUrl;
        }
      }

      files.push({
        id: String(row.id),
        fileName: String(row.file_name ?? "dosya"),
        fileUrl,
        storagePath,
        fileSize:
          typeof row.file_size === "number"
            ? row.file_size
            : row.file_size
              ? Number(row.file_size)
              : null,
        createdAt: (row.created_at as string | null) ?? null,
      });
    }

    return { success: true, files };
  } catch (error) {
    return {
      success: false,
      files: [],
      error: logActionError(
        "getPersonalFiles",
        error,
        "Dosyalar getirilirken bir hata oluştu.",
      ),
    };
  }
}

export async function uploadPersonalFile(
  formData: FormData,
): Promise<{ success: true; file: PersonalFile } | { success: false; error: string }> {
  try {
    const file = formData.get("file");
    if (!(file instanceof File) || file.size <= 0) {
      return { success: false, error: "Geçerli bir dosya seçin." };
    }
    if (file.size > 25 * 1024 * 1024) {
      return { success: false, error: "Dosya boyutu 25 MB sınırını aşıyor." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const { supabase, user } = auth;
    const safeName = file.name.replace(/[^\w.\-()+\s]/gi, "_").slice(0, 120);
    const storagePath = `${user.id}/${crypto.randomUUID()}-${safeName}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("personal-files")
      .upload(storagePath, bytes, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      console.error("[uploadPersonalFile] storage:", uploadError.message);
      return {
        success: false,
        error: "Dosya yüklenemedi. Storage bucket hazır mı?",
      };
    }

    const { data: signed } = await supabase.storage
      .from("personal-files")
      .createSignedUrl(storagePath, 60 * 60);

    const { data, error } = await supabase
      .from("personal_files")
      .insert({
        user_id: user.id,
        file_name: file.name,
        file_url: signed?.signedUrl ?? storagePath,
        storage_path: storagePath,
        file_size: file.size,
      })
      .select("id, file_name, file_url, storage_path, file_size, created_at")
      .single();

    if (error || !data) {
      console.error("[uploadPersonalFile] insert:", error?.message);
      await supabase.storage.from("personal-files").remove([storagePath]);
      return { success: false, error: "Dosya kaydı oluşturulamadı." };
    }

    revalidatePersonal();
    return {
      success: true,
      file: {
        id: String(data.id),
        fileName: String(data.file_name ?? file.name),
        fileUrl: signed?.signedUrl ?? String(data.file_url ?? ""),
        storagePath: storagePath,
        fileSize: file.size,
        createdAt: (data.created_at as string | null) ?? null,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "uploadPersonalFile",
        error,
        "Dosya yüklenirken bir hata oluştu.",
      ),
    };
  }
}

export async function deletePersonalFile(id: string): Promise<SimpleResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, error: "Oturum bulunamadı." };
    }

    const fileId = id?.trim();
    if (!fileId) return { success: false, error: "Dosya kimliği zorunludur." };

    const { data: existing, error: fetchError } = await auth.supabase
      .from("personal_files")
      .select("id, storage_path")
      .eq("id", fileId)
      .eq("user_id", auth.user.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return { success: false, error: "Dosya bulunamadı." };
    }

    if (
      typeof existing.storage_path === "string" &&
      existing.storage_path.trim()
    ) {
      const { error: storageError } = await auth.supabase.storage
        .from("personal-files")
        .remove([existing.storage_path.trim()]);
      if (storageError) {
        console.error("[deletePersonalFile] storage:", storageError.message);
      }
    }

    const { error } = await auth.supabase
      .from("personal_files")
      .delete()
      .eq("id", fileId)
      .eq("user_id", auth.user.id);

    if (error) {
      console.error("[deletePersonalFile]", error.message);
      return { success: false, error: "Dosya silinemedi." };
    }

    revalidatePersonal();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "deletePersonalFile",
        error,
        "Dosya silinirken bir hata oluştu.",
      ),
    };
  }
}
