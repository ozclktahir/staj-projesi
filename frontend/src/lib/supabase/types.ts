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
  created_at?: string | null;
  updated_at?: string | null;
  created_by?: string | null;
};

export const TASK_STATUSES: TaskStatus[] = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES: TaskPriority[] = ["LOW", "MEDIUM", "HIGH"];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "Yapılacak",
  IN_PROGRESS: "Devam ediyor",
  DONE: "Tamamlandı",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
};
