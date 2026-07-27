import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Göreve bağlı kayıtları temizler, ardından hard delete dener;
 * FK/RLS engelinde soft-delete (deleted_at) fallback uygular.
 * Sonuç doğrulanır — silinemediyse error döner.
 */
export async function purgeAndDeleteTask(
  supabase: SupabaseClient,
  taskId: string,
): Promise<{ error: { message: string } | null }> {
  const id = taskId?.trim();
  if (!id) {
    return { error: { message: "Görev kimliği zorunlu." } };
  }

  // 1) Alt görevler
  const { error: subError } = await supabase
    .from("tasks")
    .delete()
    .eq("parent_task_id", id);
  if (subError) {
    // Soft-delete alt görevler
    await supabase
      .from("tasks")
      .update({ deleted_at: new Date().toISOString() })
      .eq("parent_task_id", id);
  }

  // 2) Yorumlar
  for (const table of ["task_comments", "comments"] as const) {
    const { error } = await supabase.from(table).delete().eq("task_id", id);
    if (error && !error.message.includes("does not exist") && error.code !== "42P01") {
      console.warn(`[purgeAndDeleteTask] ${table}:`, error.message);
    }
  }

  // 3) Ekler / dosyalar
  for (const table of ["task_attachments", "files", "task_files"] as const) {
    const { error } = await supabase.from(table).delete().eq("task_id", id);
    if (error && !error.message.includes("does not exist") && error.code !== "42P01") {
      console.warn(`[purgeAndDeleteTask] ${table}:`, error.message);
    }
  }

  // 4) Hard delete (tercih edilen)
  let { error } = await supabase.from("tasks").delete().eq("id", id);

  if (error) {
    console.error("Görev silinirken veritabanı hatası oluştu:", error);

    // 5) Soft-delete fallback
    const deletedAt = new Date().toISOString();
    const soft = await supabase
      .from("tasks")
      .update({
        deleted_at: deletedAt,
        deletion_status: "none",
        deletion_requested_by: null,
        deletion_requested_at: null,
      })
      .eq("id", id)
      .select("id, deleted_at")
      .maybeSingle();

    if (
      soft.error?.message?.includes("deletion_status") ||
      soft.error?.message?.includes("deletion_requested")
    ) {
      const soft2 = await supabase
        .from("tasks")
        .update({ deleted_at: deletedAt })
        .eq("id", id)
        .select("id, deleted_at")
        .maybeSingle();
      if (soft2.error || !soft2.data?.deleted_at) {
        return {
          error: {
            message:
              soft2.error?.message ||
              error.message ||
              "Görev silinemedi (veritabanı engeli).",
          },
        };
      }
      return { error: null };
    }

    if (soft.error || !soft.data?.deleted_at) {
      if (soft.error?.message?.includes("deleted_at")) {
        return {
          error: {
            message:
              error.message ||
              "Görev silinemedi. İlişkili kayıtlar engel olmuş olabilir.",
          },
        };
      }
      return {
        error: {
          message:
            soft.error?.message ||
            error.message ||
            "Görev silinemedi (RLS veya kısıt).",
        },
      };
    }

    return { error: null };
  }

  // Hard delete başarılı — satır kalmamalı
  const { data: stillThere } = await supabase
    .from("tasks")
    .select("id, deleted_at")
    .eq("id", id)
    .maybeSingle();

  if (stillThere && !stillThere.deleted_at) {
    // RLS hard delete'i yutmuş olabilir → soft dene
    const deletedAt = new Date().toISOString();
    const soft = await supabase
      .from("tasks")
      .update({
        deleted_at: deletedAt,
        deletion_status: "none",
        deletion_requested_by: null,
        deletion_requested_at: null,
      })
      .eq("id", id)
      .select("id, deleted_at")
      .maybeSingle();

    if (!soft.data?.deleted_at) {
      return {
        error: {
          message:
            "Görev silinemedi. RLS politikası silme işlemini engellemiş olabilir.",
        },
      };
    }
  }

  return { error: null };
}
