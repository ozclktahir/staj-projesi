"use server";

import { logActionError } from "@/lib/action-result";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type TaskPriority,
} from "@/lib/supabase/types";
import type { UpcomingDeadlineItem } from "@/types/personal-workspace";

export type GetUpcomingDeadlinesResult =
  | { success: true; items: UpcomingDeadlineItem[] }
  | { success: false; error: string; items: [] };

function normalizePriority(value: unknown): TaskPriority {
  if (typeof value !== "string") return "MEDIUM";
  const p = value.toUpperCase();
  if (p === "HIGH" || p === "YUKSEK" || p === "YÜKSEK") return "HIGH";
  if (p === "LOW" || p === "DUSUK" || p === "DÜŞÜK") return "LOW";
  return "MEDIUM";
}

function readJoinedName(value: unknown): string | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    const first = value[0];
    if (first && typeof first === "object" && "name" in first) {
      const name = (first as { name?: unknown }).name;
      return typeof name === "string" && name.trim() ? name.trim() : null;
    }
    return null;
  }
  if (typeof value === "object" && "name" in value) {
    const name = (value as { name?: unknown }).name;
    return typeof name === "string" && name.trim() ? name.trim() : null;
  }
  return null;
}

/**
 * Görev, alt görev ve kişisel yapılacakları due_date'e göre ASC sıralar.
 */
export async function getUpcomingDeadlinesItems(): Promise<GetUpcomingDeadlinesResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı.",
        items: [],
      };
    }

    const { supabase, user } = auth;

    const [tasksRes, todosRes] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, parent_task_id, project_id, deleted_at, projects:project_id(name)",
        )
        .not("due_date", "is", null)
        .is("deleted_at", null)
        .order("due_date", { ascending: true })
        .limit(200),
      supabase
        .from("personal_todos")
        .select("id, task, due_date, is_completed")
        .eq("user_id", user.id)
        .not("due_date", "is", null)
        .order("due_date", { ascending: true })
        .limit(100),
    ]);

    if (tasksRes.error) {
      console.error("[getUpcomingDeadlinesItems] tasks:", tasksRes.error.message);
      return {
        success: false,
        error: "Teslim tarihleri getirilirken bir hata oluştu.",
        items: [],
      };
    }

    const taskRows = (tasksRes.data ?? []) as Record<string, unknown>[];
    const titleById = new Map<string, string>();
    for (const row of taskRows) {
      const id = typeof row.id === "string" ? row.id : null;
      if (!id) continue;
      titleById.set(
        id,
        (typeof row.title === "string" && row.title) || "Adsız görev",
      );
    }

    const childrenByParent = new Map<
      string,
      UpcomingDeadlineItem["subtasks"]
    >();

    for (const row of taskRows) {
      const parentId =
        typeof row.parent_task_id === "string" ? row.parent_task_id : null;
      if (!parentId) continue;
      const status = normalizeTaskStatusInput(row.status) ?? "TODO";
      const list = childrenByParent.get(parentId) ?? [];
      list.push({
        id: String(row.id),
        title: (typeof row.title === "string" && row.title) || "Alt görev",
        status,
        dueDate: (row.due_date as string | null) ?? null,
        completed: status === "DONE",
      });
      childrenByParent.set(parentId, list);
    }

    const items: UpcomingDeadlineItem[] = [];

    for (const row of taskRows) {
      const dueDate =
        typeof row.due_date === "string" ? row.due_date : null;
      if (!dueDate) continue;
      const status = normalizeTaskStatusInput(row.status) ?? "TODO";
      const parentId =
        typeof row.parent_task_id === "string" ? row.parent_task_id : null;
      const id = String(row.id);
      const projectId =
        typeof row.project_id === "string" ? row.project_id : null;

      if (parentId) {
        items.push({
          id,
          kind: "subtask",
          title: (typeof row.title === "string" && row.title) || "Alt görev",
          dueDate,
          status,
          priority: normalizePriority(row.priority),
          projectId,
          projectName: readJoinedName(row.projects),
          parentTaskId: parentId,
          parentTaskTitle: titleById.get(parentId) ?? null,
          completed: status === "DONE",
          subtasks: [],
        });
      } else {
        items.push({
          id,
          kind: "task",
          title: (typeof row.title === "string" && row.title) || "Adsız görev",
          dueDate,
          status,
          priority: normalizePriority(row.priority),
          projectId,
          projectName: readJoinedName(row.projects),
          parentTaskId: null,
          parentTaskTitle: null,
          completed: status === "DONE",
          subtasks: childrenByParent.get(id) ?? [],
        });
      }
    }

    if (!todosRes.error) {
      for (const row of todosRes.data ?? []) {
        const dueDate =
          typeof row.due_date === "string" ? row.due_date : null;
        if (!dueDate) continue;
        const completed = Boolean(row.is_completed);
        items.push({
          id: String(row.id),
          kind: "todo",
          title: String(row.task ?? "Yapılacak"),
          dueDate,
          status: completed ? "DONE" : "OPEN",
          priority: null,
          projectId: null,
          projectName: null,
          parentTaskId: null,
          parentTaskTitle: null,
          completed,
          subtasks: [],
        });
      }
    } else {
      console.warn("[getUpcomingDeadlinesItems] todos:", todosRes.error.message);
    }

    items.sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    return { success: true, items };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "getUpcomingDeadlinesItems",
        error,
        "Teslim tarihleri getirilirken bir hata oluştu.",
      ),
      items: [],
    };
  }
}
