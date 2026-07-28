"use server";

import { logActionError } from "@/lib/action-result";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import type { AssignedTaskWithSubtasks } from "@/types/personal-workspace";

export type GetMyTasksResult =
  | { success: true; tasks: ProjectTask[] }
  | { success: false; error: string; tasks: [] };

function normalizePriority(priority: unknown): TaskPriority {
  if (typeof priority !== "string") return "MEDIUM";
  const p = priority.toUpperCase();
  if (p === "HIGH" || p === "YUKSEK" || p === "YÜKSEK") return "HIGH";
  if (p === "LOW" || p === "DUSUK" || p === "DÜŞÜK") return "LOW";
  return "MEDIUM";
}

function normalizeStatus(status: unknown): TaskStatus {
  return normalizeTaskStatusInput(status) ?? "TODO";
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

function mapTaskRow(row: Record<string, unknown>): ProjectTask {
  const assigneeId =
    (typeof row.assignee_id === "string" && row.assignee_id) ||
    (typeof row.assigned_to === "string" && row.assigned_to) ||
    null;

  const projectJoin = row.projects ?? row.project;
  let projectName = readJoinedName(projectJoin);
  let workspaceName: string | null = null;

  if (projectJoin && typeof projectJoin === "object" && !Array.isArray(projectJoin)) {
    const proj = projectJoin as Record<string, unknown>;
    if (!projectName && typeof proj.name === "string") {
      projectName = proj.name.trim() || null;
    }
    workspaceName = readJoinedName(proj.workspaces ?? proj.workspace);
  } else if (Array.isArray(projectJoin) && projectJoin[0]) {
    const proj = projectJoin[0] as Record<string, unknown>;
    if (!projectName && typeof proj.name === "string") {
      projectName = proj.name.trim() || null;
    }
    workspaceName = readJoinedName(proj.workspaces ?? proj.workspace);
  }

  return {
    id: String(row.id),
    title: (typeof row.title === "string" && row.title) || "Adsız görev",
    description: (row.description as string | null) ?? null,
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    project_id: (row.project_id as string | null) ?? null,
    workspace_id: (row.workspace_id as string | null) ?? null,
    due_date: (row.due_date as string | null) ?? null,
    parent_task_id: (row.parent_task_id as string | null) ?? null,
    assignee_id: assigneeId,
    assignee: null,
    project_name: projectName,
    workspace_name: workspaceName,
    assignment_status:
      typeof row.assignment_status === "string"
        ? (row.assignment_status.toLowerCase() as
            | "pending"
            | "accepted"
            | "rejected")
        : "accepted",
    deletion_status:
      typeof row.deletion_status === "string"
        ? (row.deletion_status.toLowerCase() as
            | "none"
            | "pending_admin_approval"
            | "pending_user_approval")
        : "none",
    assignment_pending_at: (row.assignment_pending_at as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    created_by: (row.created_by as string | null) ?? null,
    subtask_done: 0,
    subtask_total: 0,
  };
}

async function enrichProjectNames(
  supabase: Awaited<
    NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  >["supabase"],
  tasks: ProjectTask[],
): Promise<ProjectTask[]> {
  const missingIds = [
    ...new Set(
      tasks
        .filter((t) => t.project_id && !t.project_name)
        .map((t) => t.project_id as string),
    ),
  ];
  if (missingIds.length === 0) return tasks;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, workspace_id, workspaces:workspace_id(name)")
    .in("id", missingIds);

  const byId = new Map<
    string,
    { name: string | null; workspaceName: string | null }
  >();

  for (const row of projects ?? []) {
    const id = typeof row.id === "string" ? row.id : null;
    if (!id) continue;
    byId.set(id, {
      name: typeof row.name === "string" ? row.name : null,
      workspaceName: readJoinedName(row.workspaces),
    });
  }

  // workspaces join başarısızsa ayrı çek
  const workspaceIds = [
    ...new Set(
      (projects ?? [])
        .map((p) =>
          typeof p.workspace_id === "string" ? p.workspace_id : null,
        )
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  if (workspaceIds.length > 0) {
    const { data: workspaces } = await supabase
      .from("workspaces")
      .select("id, name")
      .in("id", workspaceIds);
    const wsById = new Map(
      (workspaces ?? []).map((w) => [
        String(w.id),
        typeof w.name === "string" ? w.name : null,
      ]),
    );
    for (const row of projects ?? []) {
      const id = typeof row.id === "string" ? row.id : null;
      if (!id) continue;
      const existing = byId.get(id);
      if (!existing) continue;
      if (!existing.workspaceName && typeof row.workspace_id === "string") {
        existing.workspaceName = wsById.get(row.workspace_id) ?? null;
      }
    }
  }

  return tasks.map((task) => {
    if (!task.project_id || task.project_name) return task;
    const meta = byId.get(task.project_id);
    if (!meta) return task;
    return {
      ...task,
      project_name: meta.name,
      workspace_name: task.workspace_name ?? meta.workspaceName,
    };
  });
}

/**
 * Oturum açmış kullanıcıya atanmış tüm görevleri (tüm projeler) getirir.
 */
export async function getMyTasks(): Promise<GetMyTasksResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
        tasks: [],
      };
    }

    const { supabase, user } = auth;

    const selectWithJoin =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to, deleted_at, assignment_status, deletion_status, assignment_pending_at, projects:project_id(id, name, workspace_id, workspaces:workspace_id(name))";
    const selectPlain =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to, deleted_at, assignment_status, deletion_status, assignment_pending_at";

    let rows: Record<string, unknown>[] | null = null;

    const primary = await supabase
      .from("tasks")
      .select(selectWithJoin)
      .eq("assignee_id", user.id)
      .is("deleted_at", null)
      .is("parent_task_id", null)
      .order("created_at", { ascending: false });

    if (primary.error) {
      console.warn("[getMyTasks] join select failed:", primary.error.message);
      const fallback = await supabase
        .from("tasks")
        .select(selectPlain)
        .eq("assignee_id", user.id)
        .order("created_at", { ascending: false });

      if (fallback.error) {
        const legacy = await supabase
          .from("tasks")
          .select(selectPlain)
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false });
        if (legacy.error) {
          console.error("[getMyTasks]", legacy.error.message);
          return {
            success: false,
            error: "Görevler getirilirken bir hata oluştu.",
            tasks: [],
          };
        }
        rows = (legacy.data as Record<string, unknown>[] | null) ?? [];
      } else {
        rows = (fallback.data as Record<string, unknown>[] | null) ?? [];
      }
    } else {
      rows = (primary.data as Record<string, unknown>[] | null) ?? [];
    }

    const filtered = (rows ?? []).filter((row) => {
      if (row.deleted_at != null && row.deleted_at !== "") return false;
      if (row.parent_task_id != null && row.parent_task_id !== "") return false;
      const assignmentStatus =
        typeof row.assignment_status === "string"
          ? row.assignment_status.toLowerCase()
          : null;
      if (assignmentStatus === "rejected") return false;
      const assignee =
        (typeof row.assignee_id === "string" && row.assignee_id) ||
        (typeof row.assigned_to === "string" && row.assigned_to) ||
        null;
      return assignee === user.id;
    });

    let tasks = filtered.map(mapTaskRow);
    tasks = await enrichProjectNames(supabase, tasks);

    const priorityRank: Record<TaskPriority, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };
    tasks.sort(
      (a, b) =>
        (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0),
    );

    return { success: true, tasks };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "getMyTasks",
        error,
        "Görevler getirilirken bir hata oluştu.",
      ),
      tasks: [],
    };
  }
}

export type GetAssignedTasksResult =
  | { success: true; tasks: AssignedTaskWithSubtasks[] }
  | { success: false; error: string; tasks: [] };

/**
 * Kullanıcıya atanan görev + alt görev + yapılacakları önceliğe göre DESC sıralar.
 */
export async function getAssignedTasksByPriority(): Promise<GetAssignedTasksResult> {
  try {
    const base = await getMyTasks();
    if (!base.success) {
      return { success: false, error: base.error, tasks: [] };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı. Lütfen tekrar giriş yapın.",
        tasks: [],
      };
    }

    const parentIds = base.tasks.map((t) => t.id);
    const subtasksByParent = new Map<
      string,
      AssignedTaskWithSubtasks["subtasks"]
    >();

    if (parentIds.length > 0) {
      const { data: subRows, error: subError } = await auth.supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, parent_task_id, deleted_at",
        )
        .in("parent_task_id", parentIds)
        .is("deleted_at", null)
        .order("priority", { ascending: false });

      if (subError) {
        console.warn(
          "[getAssignedTasksByPriority] subtasks:",
          subError.message,
        );
      } else {
        for (const row of subRows ?? []) {
          const parentId =
            typeof row.parent_task_id === "string" ? row.parent_task_id : null;
          if (!parentId) continue;
          const list = subtasksByParent.get(parentId) ?? [];
          list.push({
            id: String(row.id),
            title:
              (typeof row.title === "string" && row.title) || "Alt görev",
            status: normalizeStatus(row.status),
            priority: normalizePriority(row.priority),
            due_date: (row.due_date as string | null) ?? null,
          });
          subtasksByParent.set(parentId, list);
        }
      }
    }

    // Kişisel yapılacakları da öncelik sıralamasına dahil etmek için
    // "görev benzeri" sanal kayıt üretmiyoruz; UI filtrelerinde todos ayrı.
    // İstek: görev, alt görev ve yapılacaklar — yapılacakları ayrı listede ekliyoruz.
    const { data: todos } = await auth.supabase
      .from("personal_todos")
      .select("id, task, due_date, is_completed")
      .eq("user_id", auth.user.id)
      .eq("is_completed", false)
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50);

    const todoAsTasks: AssignedTaskWithSubtasks[] = (todos ?? []).map(
      (row) => ({
        id: `todo:${String(row.id)}`,
        title: String(row.task ?? "Yapılacak"),
        description: null,
        status: (row.is_completed ? "DONE" : "TODO") as TaskStatus,
        priority: "MEDIUM" as TaskPriority,
        project_id: null,
        workspace_id: null,
        due_date: (row.due_date as string | null) ?? null,
        parent_task_id: null,
        assignee_id: auth.user.id,
        project_name: "Kişisel yapılacak",
        workspace_name: null,
        assignment_status: "accepted",
        deletion_status: "none",
        assignment_pending_at: null,
        created_at: null,
        created_by: null,
        subtask_done: 0,
        subtask_total: 0,
        subtasks: [],
      }),
    );

    const priorityRank: Record<TaskPriority, number> = {
      HIGH: 3,
      MEDIUM: 2,
      LOW: 1,
    };

    const tasks: AssignedTaskWithSubtasks[] = [
      ...base.tasks.map((task) => ({
        ...task,
        subtasks: subtasksByParent.get(task.id) ?? [],
      })),
      ...todoAsTasks,
    ].sort(
      (a, b) =>
        (priorityRank[b.priority] ?? 0) - (priorityRank[a.priority] ?? 0),
    );

    return { success: true, tasks };
  } catch (error) {
    return {
      success: false,
      error: logActionError(
        "getAssignedTasksByPriority",
        error,
        "Atanan görevler getirilirken bir hata oluştu.",
      ),
      tasks: [],
    };
  }
}

