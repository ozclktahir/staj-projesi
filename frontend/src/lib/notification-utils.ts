/** Bildirim yardımcıları — Server Action dosyasında export edilmez. */

export type NotificationItem = {
  id: string;
  workspaceId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
};

export type PendingInvitationItem = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  role: string | null;
  email: string;
  createdAt: string | null;
};

export type NotificationKind =
  | "workspace_invite"
  | "task_assigned"
  | "task_claim_request"
  | "task_deletion_request"
  | "due_date_warning"
  | "generic";

export function isInviteType(type: string): boolean {
  const t = type.trim().toLowerCase();
  return (
    t === "workspace_invite" ||
    t === "workspace_invitation" ||
    t === "invite"
  );
}

export function isWorkspaceInviteNotification(n: NotificationItem): boolean {
  return isInviteType(n.type);
}

export function getNotificationKind(n: NotificationItem): NotificationKind {
  const t = n.type.trim().toLowerCase();
  if (isInviteType(t)) return "workspace_invite";
  if (
    t === "task_claim_request" ||
    t === "task_claim" ||
    t === "assignment_claim"
  ) {
    return "task_claim_request";
  }
  if (
    t === "task_deletion_request" ||
    t === "task_delete_request" ||
    t === "deletion_approval"
  ) {
    return "task_deletion_request";
  }
  if (
    t === "task_assigned" ||
    t === "task_assignment" ||
    t === "assignee_changed"
  ) {
    return "task_assigned";
  }
  if (
    t === "due_date_warning" ||
    t === "due_soon" ||
    t === "overdue" ||
    t === "deadline"
  ) {
    return "due_date_warning";
  }
  return "generic";
}

export function invitationIdFromNotification(
  n: NotificationItem,
): string | null {
  const meta = n.payload ?? n.metadata;
  if (!meta) return null;
  const id = meta.invitation_id ?? meta.invite_id;
  return typeof id === "string" && id.trim() ? id : null;
}

export function taskIdFromNotification(n: NotificationItem): string | null {
  const meta = n.payload ?? n.metadata;
  if (!meta) return null;
  const id = meta.task_id;
  return typeof id === "string" && id.trim() ? id : null;
}

export function isActionableTaskNotification(n: NotificationItem): boolean {
  const kind = getNotificationKind(n);
  return (
    kind === "task_claim_request" || kind === "task_deletion_request"
  );
}

export function taskLinkFromNotification(n: NotificationItem): string | null {
  if (n.link?.trim()) return n.link.trim();
  const meta = n.payload ?? n.metadata;
  if (!meta) return null;
  const projectId =
    (typeof meta.project_id === "string" && meta.project_id) || null;
  const workspaceId =
    n.workspaceId ||
    (typeof meta.workspace_id === "string" ? meta.workspace_id : null);
  if (!projectId) return null;
  const base = `/project/${projectId}`;
  if (workspaceId) {
    return `${base}?workspaceId=${encodeURIComponent(workspaceId)}`;
  }
  return base;
}
