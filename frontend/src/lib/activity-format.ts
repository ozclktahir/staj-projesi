import { translate, type Locale } from "@/i18n/config";
import {
  localizedPriority,
  localizedStatus,
} from "@/lib/localized-labels";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";
import type { ActivityLogItem } from "@/app/actions/activity-logs";

type Translate = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

function makeT(locale: Locale): Translate {
  return (key, vars) => translate(locale, key, vars);
}

function labelStatus(value: unknown, t: Translate): string {
  if (typeof value !== "string") return String(value ?? "");
  const key = value.toUpperCase() as TaskStatus;
  if (key === "TODO" || key === "IN_PROGRESS" || key === "DONE") {
    return localizedStatus(t, key);
  }
  return value;
}

function labelPriority(value: unknown, t: Translate): string {
  if (typeof value !== "string") return String(value ?? "");
  const key = value.toUpperCase() as TaskPriority;
  if (key === "HIGH" || key === "MEDIUM" || key === "LOW") {
    return localizedPriority(t, key);
  }
  return value;
}

/** Avatar satırı için insan okunur açıklama */
export function formatActivityMessage(
  log: ActivityLogItem,
  locale: Locale = "tr",
): string {
  const t = makeT(locale);
  const d = log.details;
  const taskTitle =
    (typeof d.task_title === "string" && d.task_title) ||
    t("activity.fallbackTask");
  const name = log.actorName || t("activity.unknownUser");

  switch (log.actionType) {
    case "task_created":
      return t("activity.taskCreated", { name, task: taskTitle });
    case "task_deleted":
      return t("activity.taskDeleted", { name, task: taskTitle });
    case "status_changed":
      return t("activity.statusChanged", {
        name,
        task: taskTitle,
        value: labelStatus(d.new_value, t),
      });
    case "priority_changed":
      return t("activity.priorityChanged", {
        name,
        task: taskTitle,
        value: labelPriority(d.new_value, t),
      });
    case "assignee_changed":
      return t("activity.assigneeChanged", {
        name,
        task: taskTitle,
        assignee:
          typeof d.new_assignee_name === "string" && d.new_assignee_name
            ? d.new_assignee_name
            : t("activity.someone"),
      });
    case "comment_added":
      return t("activity.commentAdded", { name, task: taskTitle });
    case "attachment_added": {
      const fileName =
        typeof d.file_name === "string" ? d.file_name : t("activity.aFile");
      return t("activity.attachmentAdded", {
        name,
        task: taskTitle,
        file: fileName,
      });
    }
    case "task_updated":
      return t("activity.taskUpdated", { name, task: taskTitle });
    case "task_claim_accepted":
      return t("activity.claimAccepted", { name, task: taskTitle });
    case "task_claim_rejected":
      return t("activity.claimRejected", { name, task: taskTitle });
    case "task_reassigned": {
      const assignee =
        (typeof d.new_assignee_name === "string" && d.new_assignee_name) ||
        t("activity.aUser");
      return t("activity.taskReassigned", {
        name,
        task: taskTitle,
        assignee,
      });
    }
    default:
      return t("activity.defaultAction", { name });
  }
}
