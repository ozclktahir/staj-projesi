import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatAuthUserLabel } from "@/lib/member-labels";

export type StoredAuthUser = {
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
    display_name?: string;
  };
};

export const AUTH_COOKIE = "auth_session";
export const ACCESS_TOKEN_COOKIE = "sb_access_token";
export const REFRESH_TOKEN_COOKIE = "sb_refresh_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const EXPIRED_COOKIE =
  "path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";

/** JWT imza doğrulamadan sadece exp kontrolü (client/proxy için). */
export function isJwtExpired(token: string | null | undefined): boolean {
  if (!token || token.trim() === "") {
    return true;
  }

  try {
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) {
      return true;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    if (typeof payload.exp !== "number") {
      return true;
    }

    // 30 sn tolerans
    return payload.exp * 1000 <= Date.now() - 30_000;
  } catch {
    return true;
  }
}

export function resolveUserDisplayName(
  user?: StoredAuthUser | null,
): string {
  return formatAuthUserLabel(user ?? null);
}

export function readStoredUser(): StoredAuthUser | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = localStorage.getItem("user");
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as StoredAuthUser;
  } catch {
    return null;
  }
}

export function readAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const token = localStorage.getItem("access_token");
    if (!token || token.trim() === "") {
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

function setProxySessionCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function setTokenCookies(accessToken: string, refreshToken?: string | null) {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  if (refreshToken) {
    document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}

function clearNamedCookie(name: string) {
  document.cookie = `${name}=; ${EXPIRED_COOKIE}`;
}

function clearTokenCookies() {
  clearNamedCookie(ACCESS_TOKEN_COOKIE);
  clearNamedCookie(REFRESH_TOKEN_COOKIE);
  clearNamedCookie("access_token");
  clearNamedCookie("refresh_token");
}

/** Supabase SSR'nin yazdığı chunk cookie'lerini de temizle. */
function clearSupabaseSsrCookies() {
  if (typeof document === "undefined") {
    return;
  }

  try {
    const names = document.cookie
      .split(";")
      .map((part) => part.trim().split("=")[0])
      .filter(Boolean);

    for (const name of names) {
      if (
        name.startsWith("sb-") ||
        name.startsWith("supabase-") ||
        name === AUTH_COOKIE ||
        name === ACCESS_TOKEN_COOKIE ||
        name === REFRESH_TOKEN_COOKIE ||
        name === "access_token" ||
        name === "refresh_token"
      ) {
        clearNamedCookie(name);
      }
    }
  } catch {
    // ignore
  }
}

export async function persistAuthSession(
  accessToken: string,
  user?: unknown,
  refreshToken?: string | null,
) {
  if (!accessToken || typeof accessToken !== "string") {
    return;
  }

  try {
    // Eski/bozuk sb-* cookie'lerini temizle (cookie şişmesi / ISE önlemi)
    clearSupabaseSsrCookies();

    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    } else {
      localStorage.removeItem("refresh_token");
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    setProxySessionCookie();
    setTokenCookies(accessToken, refreshToken);
  } catch {
    // Storage / cookie yazılamazsa sessizce devam et
  }
}

export async function clearAuthSession() {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
    localStorage.removeItem("active_workspace_id");
  } catch {
    // ignore
  }

  try {
    clearSupabaseSsrCookies();
    clearNamedCookie(AUTH_COOKIE);
    clearNamedCookie("active_workspace_id");
    clearTokenCookies();
  } catch {
    // ignore
  }

  try {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
    clearSupabaseSsrCookies();
  } catch {
    clearSupabaseSsrCookies();
  }
}

/** localStorage token varsa cookie senkronlar; süresi dolmuşsa temizler. */
export async function syncAuthCookiesFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken || accessToken.trim() === "" || isJwtExpired(accessToken)) {
      await clearAuthSession();
      return;
    }

    setProxySessionCookie();
    setTokenCookies(accessToken, refreshToken);
  } catch {
    // ignore
  }
}
