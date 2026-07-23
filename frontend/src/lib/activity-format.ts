import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/supabase/types";
import type { ActivityLogItem } from "@/app/actions/activity-logs";

function labelStatus(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const key = value.toUpperCase() as TaskStatus;
  return TASK_STATUS_LABELS[key] ?? value;
}

function labelPriority(value: unknown): string {
  if (typeof value !== "string") return String(value ?? "");
  const key = value.toUpperCase() as TaskPriority;
  return TASK_PRIORITY_LABELS[key] ?? value;
}

/** Avatar satırı için insan okunur açıklama */
export function formatActivityMessage(log: ActivityLogItem): string {
  const d = log.details;
  const taskTitle =
    (typeof d.task_title === "string" && d.task_title) || "görev";
  const name = log.actorName || "Bir kullanıcı";

  switch (log.actionType) {
    case "task_created":
      return `${name} "${taskTitle}" görevini oluşturdu`;
    case "task_deleted":
      return `${name} "${taskTitle}" görevini sildi`;
    case "status_changed":
      return `${name} "${taskTitle}" görevini "${labelStatus(d.new_value)}" olarak işaretledi`;
    case "priority_changed":
      return `${name} "${taskTitle}" önceliğini "${labelPriority(d.new_value)}" yaptı`;
    case "assignee_changed":
      return `${name} "${taskTitle}" görevini ${
        typeof d.new_assignee_name === "string" && d.new_assignee_name
          ? d.new_assignee_name
          : "birine"
      } atadı`;
    case "comment_added":
      return `${name} "${taskTitle}" görevine yorum ekledi`;
    case "attachment_added": {
      const fileName =
        typeof d.file_name === "string" ? d.file_name : "bir dosya";
      return `${name} "${taskTitle}" görevine ${fileName} ekledi`;
    }
    case "task_updated":
      return `${name} "${taskTitle}" görevini güncelledi`;
    default:
      return `${name} bir işlem yaptı`;
  }
}
