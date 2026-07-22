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

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Boş ayraç / tire kalıntıları
  if (trimmed === "-" || trimmed === "—" || trimmed === "–") return null;
  return trimmed;
}

/** e-posta yerel kısmı: ahmet@x.com → ahmet */
export function emailLocalPart(email: string | null | undefined): string | null {
  const mail = cleanText(email);
  if (!mail || !mail.includes("@")) return mail;
  const local = mail.split("@")[0]?.trim() ?? "";
  return local || null;
}

/** Profil + e-postadan ad ve e-posta çıkarır. */
export function extractUserNameParts(
  profile: Record<string, unknown> | null | undefined,
  email?: string | null,
): NameParts {
  const fullName =
    cleanText(profile?.full_name) ||
    cleanText(profile?.display_name) ||
    cleanText(profile?.name) ||
    null;

  const first = cleanText(profile?.first_name) ?? "";
  const last = cleanText(profile?.last_name) ?? "";
  const combined = `${first} ${last}`.trim() || null;

  const username = cleanText(profile?.username);

  const mail =
    cleanText(email) ||
    cleanText(profile?.email) ||
    null;

  return {
    name: fullName || combined || username || null,
    email: mail,
  };
}

/**
 * Son çare etiket — asla tek başına "-", "—", null, undefined dönmez.
 */
function resolveLabelFallback(email: string | null): string {
  return emailLocalPart(email) || email || "Kullanıcı Yükleniyor...";
}

/**
 * UI header/menü için kesin fallback zinciri:
 * metadata.full_name → profile.full_name → email local → email → yükleniyor
 */
export function resolveUiDisplayName(input: {
  metadataFullName?: string | null;
  profileFullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  loading?: boolean;
}): string {
  const meta = cleanText(input.metadataFullName);
  const profile = cleanText(input.profileFullName);
  const combined = `${cleanText(input.firstName) ?? ""} ${cleanText(input.lastName) ?? ""}`.trim();
  const local = emailLocalPart(input.email);
  const mail = cleanText(input.email);

  const resolved = meta || profile || combined || local || mail;
  if (resolved) return resolved;

  if (input.loading) return "Kullanıcı Yükleniyor...";
  console.warn("[resolveUiDisplayName] kullanıcı adı çözülemedi", input);
  return "Kullanıcı Yükleniyor...";
}

/**
 * Kompakt etiket (header, kart): Ad Soyad → e-posta → e-posta yerel kısmı.
 */
export function formatUserCompact(
  profile?: Record<string, unknown> | null,
  email?: string | null,
): string {
  const parts = extractUserNameParts(profile, email);
  if (parts.name) return parts.name;
  if (parts.email) return parts.email;
  return resolveLabelFallback(parts.email);
}

/**
 * Dropdown / liste: Ad Soyad (email) — boş parçalar birleştirilmez.
 * Mantık: name ? (email ? `${name} (${email})` : name) : email || localPart
 */
export function formatMemberOptionLabel(
  profile: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const parts = extractUserNameParts(profile, email);
  const name = parts.name;
  const mail = parts.email;

  if (name && mail) return `${name} (${mail})`;
  if (name) return name;
  if (mail) return mail;
  return resolveLabelFallback(mail);
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
  if (!input) {
    return "Kullanıcı Yükleniyor...";
  }
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
