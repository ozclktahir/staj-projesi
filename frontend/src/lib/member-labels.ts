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

export const PROFILE_SELECT_FIELDS =
  "id, full_name, display_name, first_name, last_name, email, avatar_url, name, username";

export const PROFILE_SELECT_FIELDS_FALLBACK =
  "id, full_name, email, avatar_url, first_name, last_name";

type NameParts = {
  name: string | null;
  email: string | null;
};

/** Profil + e-postadan ad ve e-posta çıkarır (jenerik fallback yok). */
export function extractUserNameParts(
  profile: Record<string, unknown> | null | undefined,
  email?: string | null,
): NameParts {
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

  const username =
    profile && typeof profile.username === "string"
      ? profile.username.trim()
      : null;

  const mail =
    (email && email.trim()) ||
    (profile && typeof profile.email === "string" && profile.email.trim()) ||
    null;

  return {
    name: fullName || combined || username || null,
    email: mail,
  };
}

/**
 * Kompakt etiket (header, kart, yorum): Ad Soyad → e-posta.
 * Jenerik "Kullanıcı" / "Üye" / "Anonim" asla dönmez.
 */
export function formatUserCompact(
  profile?: Record<string, unknown> | null,
  email?: string | null,
): string {
  const parts = extractUserNameParts(profile, email);
  return parts.name || parts.email || "—";
}

/**
 * Dropdown / liste etiketi: Ad Soyad (email) önceliği.
 */
export function formatMemberOptionLabel(
  profile: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const parts = extractUserNameParts(profile, email);
  if (parts.name && parts.email) return `${parts.name} (${parts.email})`;
  if (parts.name) return parts.name;
  if (parts.email) return parts.email;
  return "—";
}

/** Auth user_metadata + email → görünen ad (client/header). */
export function formatAuthUserLabel(input?: {
  email?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    display_name?: string;
  } | null;
} | null): string {
  if (!input) return "—";
  const meta = input.user_metadata ?? undefined;
  return formatUserCompact(
    {
      full_name: meta?.full_name,
      display_name: meta?.display_name,
      first_name: meta?.first_name,
      last_name: meta?.last_name,
      email: input.email,
    },
    input.email,
  );
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
