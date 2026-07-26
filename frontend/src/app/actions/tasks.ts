"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  normalizeTaskStatusInput,
  type ProjectTask,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";

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
export async function getMyTasks(): Promise<ProjectTask[]> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) return [];

    const { supabase, user } = auth;

    const selectWithJoin =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to, deleted_at, projects:project_id(id, name, workspace_id, workspaces:workspace_id(name))";
    const selectPlain =
      "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by, assignee_id, assigned_to, deleted_at";

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
        // assigned_to legacy
        const legacy = await supabase
          .from("tasks")
          .select(selectPlain)
          .eq("assigned_to", user.id)
          .order("created_at", { ascending: false });
        if (legacy.error) {
          console.error("[getMyTasks]", legacy.error.message);
          return [];
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
      const assignee =
        (typeof row.assignee_id === "string" && row.assignee_id) ||
        (typeof row.assigned_to === "string" && row.assigned_to) ||
        null;
      return assignee === user.id;
    });

    let tasks = filtered.map(mapTaskRow);
    tasks = await enrichProjectNames(supabase, tasks);

    console.log("[getMyTasks]", { userId: user.id, count: tasks.length });
    return tasks;
  } catch (error) {
    console.error("[getMyTasks]", error);
    return [];
  }
}
