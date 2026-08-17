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
  | "task_comment"
  | "project_event"
  | "member_event"
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
  if (
    t === "task_comment" ||
    t === "comment_added" ||
    t === "new_comment" ||
    t === "mention"
  ) {
    return "task_comment";
  }
  if (
    t === "project_created" ||
    t === "project_updated" ||
    t === "project_deleted" ||
    t === "project_assigned"
  ) {
    return "project_event";
  }
  if (
    t === "member_joined" ||
    t === "member_removed" ||
    t === "role_changed" ||
    t === "member_left"
  ) {
    return "member_event";
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

function metaString(
  meta: Record<string, unknown> | null,
  ...keys: string[]
): string | null {
  if (!meta) return null;
  for (const key of keys) {
    const value = meta[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function withParams(
  path: string,
  params: Record<string, string | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * Bildirime tıklandığında gidilecek gerçek hedef.
 *
 * `n.link` sütunu tarihsel olarak yalnızca `/project/{id}` tutuyor (görev
 * kimliği yok), bu yüzden ÖNCE metadata'dan tam hedefi kurarız; yalnızca hiçbir
 * şey çıkaramazsak kayıtlı link'e düşeriz. `taskId` query'sini
 * `ProjectTaskBoard` okuyup görev detay panelini açar.
 */
export function notificationHref(n: NotificationItem): string | null {
  const meta = n.payload ?? n.metadata;
  const kind = getNotificationKind(n);
  const workspaceId =
    n.workspaceId || metaString(meta, "workspace_id") || null;
  const projectId = metaString(meta, "project_id");
  const taskId = metaString(meta, "task_id");

  switch (kind) {
    case "workspace_invite":
      // Davet ekranı: workspace biliniyorsa doğrudan o alana, yoksa onboarding.
      return workspaceId
        ? withParams("/", { workspaceId })
        : "/onboarding";

    case "member_event":
      return withParams("/members", { workspaceId });

    case "project_event":
      return projectId
        ? withParams(`/project/${projectId}`, { workspaceId })
        : withParams("/projects", { workspaceId });

    case "task_assigned":
    case "task_claim_request":
    case "task_deletion_request":
    case "task_comment":
    case "due_date_warning": {
      if (projectId) {
        return withParams(`/project/${projectId}`, { workspaceId, taskId });
      }
      // Projesi çözülemeyen görev bildirimi → kişisel alandaki görev listesi
      if (taskId) return withParams("/personal", { workspaceId });
      break;
    }

    default:
      break;
  }

  if (projectId) {
    return withParams(`/project/${projectId}`, { workspaceId, taskId });
  }
  if (n.link?.trim()) return n.link.trim();
  if (workspaceId) return withParams("/", { workspaceId });
  return null;
}

/** Geriye dönük ad — bkz. {@link notificationHref}. */
export function taskLinkFromNotification(n: NotificationItem): string | null {
  return notificationHref(n);
}
