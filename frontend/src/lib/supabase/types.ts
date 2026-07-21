export type DashboardTaskStats = {
  total: number;
  inProgress: number;
  done: number;
};

/** workspaces tablosu — şema ile senkron */
export type Workspace = {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

/** Üyelik rolü ile zenginleştirilmiş workspace (liste / switcher) */
export type WorkspaceListItem = Workspace & {
  role?: string | null;
};

export type DashboardProject = {
  id: string;
  name: string;
  description: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  workspace_id?: string | null;
  user_id?: string | null;
  created_by?: string | null;
};

export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH";

export type ProjectTask = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string | null;
  workspace_id: string | null;
  due_date?: string | null;
  parent_task_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
  /** Tamamlanan alt görev sayısı (Kanban özeti) */
  subtask_done?: number;
  /** Toplam alt görev sayısı */
  subtask_total?: number;
};

export type Subtask = {
  id: string;
  title: string;
  status: TaskStatus;
  parent_task_id: string;
  done: boolean;
};

export type TaskComment = {
  id: string;
  task_id: string;
  content: string;
  user_id: string | null;
  author_name: string;
  created_at: string | null;
};

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  DONE: "Tamamlandı",
};

/** Frontend/API → kanonik TaskStatus (todo / TODO / in_progress / IN_PROGRESS vb.) */
export function normalizeTaskStatusInput(value: unknown): TaskStatus | null {
  if (typeof value !== "string") return null;
  const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  if (key === "TODO" || key === "TO_DO") return "TODO";
  if (key === "IN_PROGRESS" || key === "INPROGRESS" || key === "DOING") {
    return "IN_PROGRESS";
  }
  if (key === "DONE" || key === "COMPLETED" || key === "COMPLETE") return "DONE";
  return null;
}

/** DB enum/check farklı yazımları kabul edebilir — sırayla dene */
export function taskStatusDbVariants(status: TaskStatus): string[] {
  const lower: Record<TaskStatus, string> = {
    TODO: "todo",
    IN_PROGRESS: "in_progress",
    DONE: "done",
  };
  return [status, lower[status]];
}

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};
