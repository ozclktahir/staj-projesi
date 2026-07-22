import { isAdminRole } from "@/lib/rbac";
import type { WorkspaceListItem } from "@/lib/supabase/types";

export type WorkspaceMemberOption = {
  id: string;
  /** Dropdown / kart: gerçek ad veya e-posta */
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

const PLACEHOLDER_LABELS = new Set([
  "kullanıcı yükleniyor...",
  "kullanıcı yükleniyor",
  "kullanıcı",
  "hesap",
  "user",
  "loading",
]);

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed === "-" || trimmed === "—" || trimmed === "–") return null;
  if (PLACEHOLDER_LABELS.has(trimmed.toLowerCase())) return null;
  return trimmed;
}

/** e-posta yerel kısmı: ahmet@x.com → ahmet */
export function emailLocalPart(email: string | null | undefined): string | null {
  const mail = cleanText(email);
  if (!mail || !mail.includes("@")) return mail;
  const local = mail.split("@")[0]?.trim() ?? "";
  return local || null;
}

/**
 * Son çare: yalnızca e-posta verisi.
 * ASLA "Kullanıcı Yükleniyor..." / "Kullanıcı" dönmez.
 */
function resolveLabelFallback(email: string | null): string {
  return emailLocalPart(email) || email || "";
}

type NameParts = {
  name: string | null;
  email: string | null;
};

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
 * Kişi adı (görev kartı / atanan kişi / tablo):
 * full_name → first+last → first → email local → email → ""
 */
export function formatPersonName(
  profile: Record<string, unknown> | null | undefined,
  email?: string | null,
): string {
  const full =
    cleanText(profile?.full_name) ||
    cleanText(profile?.display_name) ||
    cleanText(profile?.name);

  if (full) return full;

  const first = cleanText(profile?.first_name) ?? "";
  const last = cleanText(profile?.last_name) ?? "";
  const combined = `${first} ${last}`.trim();
  if (combined) return combined;
  if (first) return first;

  const username = cleanText(profile?.username);
  if (username) return username;

  const mail = cleanText(email) || cleanText(profile?.email) || null;
  return emailLocalPart(mail) || mail || "";
}

/** Header / kompakt: ad → e-posta → e-posta local → "" */
export function formatUserCompact(
  profile?: Record<string, unknown> | null,
  email?: string | null,
): string {
  return formatPersonName(profile, email);
}

/**
 * Dropdown etiketi: Ad Soyad veya Ad Soyad (email) veya email/@öncesi.
 * Placeholder metin yok.
 */
export function formatMemberOptionLabel(
  profile: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const name = formatPersonName(profile, email);
  const mail = cleanText(email) || cleanText(profile?.email) || null;
  const local = emailLocalPart(mail);

  // formatPersonName zaten local döndüyse tekrar (email) ekleme
  if (name && mail && name !== mail && name !== local) {
    return `${name} (${mail})`;
  }
  if (name) return name;
  if (mail) return mail;
  return "";
}

/** Auth metadata + email → görünen ad */
export function formatAuthUserLabel(input?: {
  email?: string | null;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    display_name?: string;
  } | null;
} | null): string {
  if (!input) return "";
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

/** @deprecated — formatPersonName kullan; loading UI'da skeleton ile ayrılır */
export function resolveUiDisplayName(input: {
  metadataFullName?: string | null;
  profileFullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  loading?: boolean;
}): string {
  return formatPersonName(
    {
      full_name: input.profileFullName || input.metadataFullName,
      first_name: input.firstName,
      last_name: input.lastName,
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
