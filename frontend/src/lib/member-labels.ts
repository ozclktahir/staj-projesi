import { isAdminRole } from "@/lib/rbac";
import type { WorkspaceListItem } from "@/lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkspaceMemberOption = {
  id: string;
  /** Dropdown / kart: gerçek ad veya e-posta */
  displayName: string;
  email: string | null;
  role: string | null;
  fullName: string | null;
  avatarUrl: string | null;
};

/** Gerçek şemada kesin olan sütunlar. Önce bunları dene (hızlı başarı). */
export const PROFILE_SELECT_BASE = "id, email, full_name, avatar_url";

/** first_name / last_name migrate edildiyse */
export const PROFILE_SELECT_WITH_NAMES =
  "id, email, full_name, avatar_url, first_name, last_name";

/** @deprecated — PROFILE_SELECT_WITH_NAMES kullan; yoksa loadProfilesByIds fallback eder */
export const PROFILE_SELECT_FIELDS = PROFILE_SELECT_WITH_NAMES;

/** @deprecated — PROFILE_SELECT_BASE kullan */
export const PROFILE_SELECT_FIELDS_FALLBACK = PROFILE_SELECT_BASE;

const PLACEHOLDER_LABELS = new Set([
  "kullanıcı yükleniyor...",
  "kullanıcı yükleniyor",
  "kullanıcı",
  "hesap",
  "user",
  "loading",
]);

export function isPlaceholderLabel(value: unknown): boolean {
  if (typeof value !== "string") return false;
  return PLACEHOLDER_LABELS.has(value.trim().toLowerCase());
}

export function cleanText(value: unknown): string | null {
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

/**
 * profiles satırlarını güvenli çeker.
 * Önce first_name/last_name dener; sütun yoksa sadece base kolonlara düşer.
 * ASLA olmayan display_name / name / username istemez.
 */
export async function loadProfilesByIds(
  supabase: SupabaseClient,
  userIds: string[],
): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return map;

  const attempts = [PROFILE_SELECT_BASE, PROFILE_SELECT_WITH_NAMES, "id, email, full_name"];

  for (const select of attempts) {
    const { data, error } = await supabase.from("profiles").select(select).in("id", ids);
    if (error) {
      console.warn("[loadProfilesByIds]", select, error.message);
      continue;
    }
    for (const row of data ?? []) {
      if (row && typeof row === "object" && "id" in row) {
        map.set(String((row as { id: string }).id), row as Record<string, unknown>);
      }
    }
    // Select başarılı — satır olmasa bile daha dar select'e gerek yok
    break;
  }

  return map;
}

/** Üye/atanan etiketi — asla ham placeholder full_name kullanma */
export function resolveMemberDisplayFields(
  profile: Record<string, unknown> | null | undefined,
  emailHint?: string | null,
): {
  email: string | null;
  fullName: string | null;
  displayName: string;
  avatarUrl: string | null;
} {
  const email =
    cleanText(emailHint) ||
    cleanText(profile?.email) ||
    null;
  const displayName = formatPersonName(profile, email);
  const avatarUrl =
    (typeof profile?.avatar_url === "string" && profile.avatar_url.trim()) ||
    null;

  return {
    email,
    fullName: displayName || null,
    displayName,
    avatarUrl,
  };
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
