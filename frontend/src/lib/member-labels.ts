import { isAdminRole } from "@/lib/rbac";
import type { WorkspaceListItem } from "@/lib/supabase/types";

export type WorkspaceMemberOption = {
  id: string;
  /** Dropdown etiketi: "Ad Soyad" veya "Ad Soyad (email)" veya email */
  displayName: string;
  email: string | null;
  role: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

/**
 * Profil alanlarından assignee/üye dropdown etiketi.
 * Jenerik "Üye" asla kullanılmaz.
 */
export function formatMemberOptionLabel(
  profile: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const fullName =
    (profile &&
      typeof profile.full_name === "string" &&
      profile.full_name.trim()) ||
    (profile &&
      typeof profile.display_name === "string" &&
      profile.display_name.trim()) ||
    (profile && typeof profile.name === "string" && profile.name.trim()) ||
    null;

  const first =
    profile && typeof profile.first_name === "string"
      ? profile.first_name.trim()
      : "";
  const last =
    profile && typeof profile.last_name === "string"
      ? profile.last_name.trim()
      : "";
  const combined = `${first} ${last}`.trim() || null;

  const name = fullName || combined;
  const mail =
    (email && email.trim()) ||
    (profile && typeof profile.email === "string" && profile.email.trim()) ||
    null;

  if (name && mail) return `${name} (${mail})`;
  if (name) return name;
  if (mail) return mail;
  return "İsimsiz kullanıcı";
}

/** Login / ilk yüklemede Admin olduğu varsayılan workspace'i seç. */
export function pickDefaultAdminWorkspace(
  workspaces: WorkspaceListItem[],
): WorkspaceListItem | null {
  if (!workspaces.length) return null;
  const adminOwned = workspaces.find(
    (w) => isAdminRole(w.role) || Boolean(w.owner_id && w.role === "OWNER"),
  );
  if (adminOwned) return adminOwned;
  const anyAdmin = workspaces.find((w) => isAdminRole(w.role));
  return anyAdmin ?? workspaces[0] ?? null;
}
