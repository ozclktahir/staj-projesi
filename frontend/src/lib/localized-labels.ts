import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

const STATUS_KEYS: Record<TaskStatus, string> = {
  TODO: "common.statusTodo",
  IN_PROGRESS: "common.statusInProgress",
  DONE: "common.statusDone",
};

const PRIORITY_KEYS: Record<TaskPriority, string> = {
  HIGH: "common.priorityHigh",
  MEDIUM: "common.priorityMedium",
  LOW: "common.priorityLow",
};

export function localizedStatus(t: Translate, status: TaskStatus): string {
  return t(STATUS_KEYS[status]);
}

export function localizedPriority(
  t: Translate,
  priority: TaskPriority,
): string {
  return t(PRIORITY_KEYS[priority]);
}
