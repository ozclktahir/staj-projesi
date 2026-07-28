import type { ProjectTask, TaskPriority, TaskStatus } from "@/lib/supabase/types";

export type PersonalNote = {
  id: string;
  title: string;
  content: string;
  taskId: string | null;
  taskTitle: string | null;
  isCompleted: boolean;
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

export type AssignedTaskSubtask = {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
};

export type AssignedTaskWithSubtasks = ProjectTask & {
  subtasks: AssignedTaskSubtask[];
};

export type UpcomingItemKind = "task" | "subtask" | "todo";

export type UpcomingDeadlineItem = {
  id: string;
  kind: UpcomingItemKind;
  title: string;
  dueDate: string;
  status: TaskStatus | "OPEN" | "DONE";
  priority: TaskPriority | null;
  projectId: string | null;
  projectName: string | null;
  parentTaskId: string | null;
  parentTaskTitle: string | null;
  completed: boolean;
  subtasks: Array<{
    id: string;
    title: string;
    status: TaskStatus;
    dueDate: string | null;
    completed: boolean;
  }>;
};
