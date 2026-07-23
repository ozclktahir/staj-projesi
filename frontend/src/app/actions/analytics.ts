"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  formatPersonName,
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import {
  normalizeTaskStatusInput,
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

export type AnalyticsSummary = {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  overdueTasks: number;
  activeMembers: number;
};

export type ChartSlice = {
  key: string;
  label: string;
  count: number;
  fill: string;
};

export type WorkloadItem = {
  userId: string;
  name: string;
  total: number;
  completed: number;
};

export type DeadlineItem = {
  id: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  projectId: string | null;
  projectName: string | null;
};

export type AnalyticsData = {
  summary: AnalyticsSummary;
  byStatus: ChartSlice[];
  byPriority: ChartSlice[];
  workload: WorkloadItem[];
  upcomingDeadlines: DeadlineItem[];
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  TODO: "#6366f1", // indigo
  IN_PROGRESS: "#f59e0b", // amber
  DONE: "#10b981", // emerald
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  HIGH: "#f43f5e", // rose
  MEDIUM: "#f59e0b", // amber
  LOW: "#10b981", // emerald
};

function emptyAnalytics(): AnalyticsData {
  return {
    summary: {
      totalTasks: 0,
      completedTasks: 0,
      completionRate: 0,
      overdueTasks: 0,
      activeMembers: 0,
    },
    byStatus: (["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((key) => ({
      key,
      label: TASK_STATUS_LABELS[key],
      count: 0,
      fill: STATUS_COLORS[key],
    })),
    byPriority: (["HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((key) => ({
      key,
      label: TASK_PRIORITY_LABELS[key],
      count: 0,
      fill: PRIORITY_COLORS[key],
    })),
    workload: [],
    upcomingDeadlines: [],
  };
}

function normalizePriority(value: unknown): TaskPriority {
  if (typeof value !== "string") return "MEDIUM";
  const p = value.toUpperCase();
  if (p === "HIGH" || p === "YUKSEK" || p === "YÜKSEK") return "HIGH";
  if (p === "LOW" || p === "DUSUK" || p === "DÜŞÜK") return "LOW";
  return "MEDIUM";
}

type TaskRow = {
  id: string;
  title: string;
  status: unknown;
  priority: unknown;
  due_date: string | null;
  assignee_id: string | null;
  assigned_to: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  deleted_at: string | null;
};

function computeFromRows(
  rows: TaskRow[],
  options: {
    activeMembers: number;
    projectNameById: Map<string, string>;
  },
): AnalyticsData {
  const topLevel = rows.filter((r) => !r.parent_task_id && !r.deleted_at);

  const statusCounts: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  };
  const priorityCounts: Record<TaskPriority, number> = {
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
  };

  const workloadMap = new Map<
    string,
    { total: number; completed: number }
  >();

  const now = Date.now();
  let overdue = 0;
  let completed = 0;

  const deadlineCandidates: DeadlineItem[] = [];

  for (const row of topLevel) {
    const status = normalizeTaskStatusInput(row.status) ?? "TODO";
    const priority = normalizePriority(row.priority);
    statusCounts[status] += 1;
    priorityCounts[priority] += 1;

    if (status === "DONE") completed += 1;

    const due = row.due_date ? new Date(row.due_date).getTime() : NaN;
    if (
      status !== "DONE" &&
      !Number.isNaN(due) &&
      due < now
    ) {
      overdue += 1;
    }

    if (row.due_date && status !== "DONE" && !Number.isNaN(due) && due >= now) {
      deadlineCandidates.push({
        id: row.id,
        title: row.title || "Adsız görev",
        dueDate: row.due_date,
        status,
        projectId: row.project_id,
        projectName: row.project_id
          ? (options.projectNameById.get(row.project_id) ?? null)
          : null,
      });
    }

    const assignee =
      (typeof row.assignee_id === "string" && row.assignee_id) ||
      (typeof row.assigned_to === "string" && row.assigned_to) ||
      null;
    if (assignee) {
      const entry = workloadMap.get(assignee) ?? { total: 0, completed: 0 };
      entry.total += 1;
      if (status === "DONE") entry.completed += 1;
      workloadMap.set(assignee, entry);
    }
  }

  const total = topLevel.length;
  const completionRate =
    total === 0 ? 0 : Math.round((completed / total) * 1000) / 10;

  return {
    summary: {
      totalTasks: total,
      completedTasks: completed,
      completionRate,
      overdueTasks: overdue,
      activeMembers: options.activeMembers,
    },
    byStatus: (["TODO", "IN_PROGRESS", "DONE"] as TaskStatus[]).map((key) => ({
      key,
      label: TASK_STATUS_LABELS[key],
      count: statusCounts[key],
      fill: STATUS_COLORS[key],
    })),
    byPriority: (["HIGH", "MEDIUM", "LOW"] as TaskPriority[]).map((key) => ({
      key,
      label: TASK_PRIORITY_LABELS[key],
      count: priorityCounts[key],
      fill: PRIORITY_COLORS[key],
    })),
    workload: [], // filled after profiles
    upcomingDeadlines: deadlineCandidates
      .sort(
        (a, b) =>
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )
      .slice(0, 8),
  };
}

async function enrichWorkload(
  supabase: Awaited<
    NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  >["supabase"],
  workloadMap: Map<string, { total: number; completed: number }>,
): Promise<WorkloadItem[]> {
  const ids = [...workloadMap.keys()];
  if (ids.length === 0) return [];

  const profiles = await loadProfilesByIds(supabase, ids);
  return ids
    .map((userId) => {
      const stats = workloadMap.get(userId)!;
      const profile = profiles.get(userId) ?? null;
      const fields = resolveMemberDisplayFields(profile, null);
      const name =
        formatPersonName(profile, fields.email) ||
        fields.displayName ||
        "Kullanıcı";
      return {
        userId,
        name,
        total: stats.total,
        completed: stats.completed,
      };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);
}

async function countWorkspaceMembers(
  supabase: Awaited<
    NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  >["supabase"],
  workspaceId: string,
): Promise<number> {
  const { count: memberCount } = await supabase
    .from("workspace_members")
    .select("user_id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("owner_id")
    .eq("id", workspaceId)
    .maybeSingle();

  let total = memberCount ?? 0;
  if (workspace?.owner_id) {
    const { data: ownerInMembers } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", workspace.owner_id)
      .maybeSingle();
    if (!ownerInMembers) total += 1;
  }
  return total;
}

async function fetchTaskRows(
  supabase: Awaited<
    NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  >["supabase"],
  filters: { workspaceId?: string | null; projectId?: string | null },
): Promise<TaskRow[]> {
  let query = supabase
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, assignee_id, assigned_to, project_id, parent_task_id, deleted_at",
    )
    .limit(2000);

  if (filters.projectId) {
    query = query.eq("project_id", filters.projectId);
  } else if (filters.workspaceId) {
    query = query.eq("workspace_id", filters.workspaceId);
  } else {
    return [];
  }

  let { data, error } = await query;

  if (error?.message?.includes("deleted_at")) {
    let retry = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, due_date, assignee_id, assigned_to, project_id, parent_task_id",
      )
      .limit(2000);
    if (filters.projectId) {
      retry = retry.eq("project_id", filters.projectId);
    } else if (filters.workspaceId) {
      retry = retry.eq("workspace_id", filters.workspaceId!);
    }
    const result = await retry;
    data = (result.data ?? []).map((r) => ({
      ...r,
      deleted_at: null,
    })) as TaskRow[];
    error = result.error;
  }

  if (error?.message?.includes("due_date")) {
    let retry = supabase
      .from("tasks")
      .select(
        "id, title, status, priority, assignee_id, assigned_to, project_id, parent_task_id",
      )
      .limit(2000);
    if (filters.projectId) {
      retry = retry.eq("project_id", filters.projectId);
    } else if (filters.workspaceId) {
      retry = retry.eq("workspace_id", filters.workspaceId!);
    }
    const result = await retry;
    if (!result.error && result.data) {
      return result.data.map((r) => ({
        ...(r as Omit<TaskRow, "due_date" | "deleted_at">),
        due_date: null,
        deleted_at: null,
      }));
    }
  }

  if (error) {
    console.error("[analytics] fetchTaskRows:", error.message);
    return [];
  }

  return ((data ?? []) as TaskRow[]).filter((r) => !r.deleted_at);
}

async function loadProjectNames(
  supabase: Awaited<
    NonNullable<Awaited<ReturnType<typeof getAuthenticatedUser>>>
  >["supabase"],
  projectIds: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (projectIds.length === 0) return map;
  const { data } = await supabase
    .from("projects")
    .select("id, name")
    .in("id", projectIds);
  for (const row of data ?? []) {
    if (typeof row.id === "string") {
      map.set(row.id, (row.name as string) || "Proje");
    }
  }
  return map;
}

function buildWorkloadMap(rows: TaskRow[]): Map<
  string,
  { total: number; completed: number }
> {
  const map = new Map<string, { total: number; completed: number }>();
  for (const row of rows) {
    if (row.parent_task_id || row.deleted_at) continue;
    const assignee =
      (typeof row.assignee_id === "string" && row.assignee_id) ||
      (typeof row.assigned_to === "string" && row.assigned_to) ||
      null;
    if (!assignee) continue;
    const status = normalizeTaskStatusInput(row.status) ?? "TODO";
    const entry = map.get(assignee) ?? { total: 0, completed: 0 };
    entry.total += 1;
    if (status === "DONE") entry.completed += 1;
    map.set(assignee, entry);
  }
  return map;
}

export async function getWorkspaceAnalytics(
  workspaceId: string | null | undefined,
): Promise<{ success: boolean; data: AnalyticsData; error?: string }> {
  try {
    const ws = workspaceId?.trim() ?? "";
    if (!ws) {
      return { success: true, data: emptyAnalytics() };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, data: emptyAnalytics(), error: "Oturum yok." };
    }

    const { supabase, user } = auth;
    const roleCtx = await resolveWorkspaceRole(supabase, ws, user.id);
    if (!roleCtx.role && !roleCtx.isOwner) {
      return {
        success: false,
        data: emptyAnalytics(),
        error: "Bu workspace'e erişiminiz yok.",
      };
    }

    const [rows, activeMembers] = await Promise.all([
      fetchTaskRows(supabase, { workspaceId: ws }),
      countWorkspaceMembers(supabase, ws),
    ]);

    const projectIds = [
      ...new Set(
        rows
          .map((r) => r.project_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    ];
    const projectNameById = await loadProjectNames(supabase, projectIds);
    const base = computeFromRows(rows, { activeMembers, projectNameById });
    const workload = await enrichWorkload(supabase, buildWorkloadMap(rows));

    return { success: true, data: { ...base, workload } };
  } catch (error) {
    console.error("[getWorkspaceAnalytics]", error);
    return {
      success: false,
      data: emptyAnalytics(),
      error: error instanceof Error ? error.message : "Analitik alınamadı.",
    };
  }
}

export async function getProjectAnalytics(
  projectId: string,
  workspaceId?: string | null,
): Promise<{ success: boolean; data: AnalyticsData; error?: string }> {
  try {
    const id = projectId?.trim() ?? "";
    if (!id) {
      return { success: false, data: emptyAnalytics(), error: "Proje zorunlu." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { success: false, data: emptyAnalytics(), error: "Oturum yok." };
    }

    const { supabase } = auth;
    const rows = await fetchTaskRows(supabase, { projectId: id });

    let activeMembers = 0;
    const ws = workspaceId?.trim();
    if (ws) {
      activeMembers = await countWorkspaceMembers(supabase, ws);
    } else {
      activeMembers = new Set(
        rows
          .map(
            (r) =>
              (typeof r.assignee_id === "string" && r.assignee_id) ||
              (typeof r.assigned_to === "string" && r.assigned_to) ||
              null,
          )
          .filter(Boolean),
      ).size;
    }

    const { data: project } = await supabase
      .from("projects")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();

    const projectNameById = new Map<string, string>();
    if (project?.id) {
      projectNameById.set(
        project.id as string,
        (project.name as string) || "Proje",
      );
    }

    const base = computeFromRows(rows, { activeMembers, projectNameById });
    const workload = await enrichWorkload(supabase, buildWorkloadMap(rows));

    // Proje görünümü: atanmış aktif kişi sayısı
    base.summary.activeMembers =
      workload.length > 0 ? workload.length : activeMembers;

    return { success: true, data: { ...base, workload } };
  } catch (error) {
    console.error("[getProjectAnalytics]", error);
    return {
      success: false,
      data: emptyAnalytics(),
      error: error instanceof Error ? error.message : "Analitik alınamadı.",
    };
  }
}
