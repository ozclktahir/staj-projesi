/** Bildirim yardımcıları — Server Action dosyasında export edilmez (Next.js sync export yasağı). */

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

export function isInviteType(type: string): boolean {
  const t = type.trim().toLowerCase();
  return t === "workspace_invite" || t === "workspace_invitation";
}

export function isWorkspaceInviteNotification(n: NotificationItem): boolean {
  return isInviteType(n.type);
}
