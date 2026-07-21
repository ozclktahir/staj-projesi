/** Workspace rolleri — Admin/OWNER yönetim, Member/Guest üye */
export type WorkspaceRoleName =
  | "OWNER"
  | "ADMIN"
  | "MEMBER"
  | "GUEST"
  | string;

export function normalizeWorkspaceRole(
  role: string | null | undefined,
): string {
  return (role ?? "").trim().toUpperCase();
}

/** Yönetici: OWNER veya ADMIN (DB'de Admin / OWNER) */
export function isAdminRole(role: string | null | undefined): boolean {
  const r = normalizeWorkspaceRole(role);
  return r === "ADMIN" || r === "OWNER";
}

export function isMemberOrAbove(role: string | null | undefined): boolean {
  const r = normalizeWorkspaceRole(role);
  return r === "ADMIN" || r === "OWNER" || r === "MEMBER";
}
