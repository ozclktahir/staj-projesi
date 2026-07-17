export type StoredAuthUser = {
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

const AUTH_COOKIE = "auth_session";
const ACCESS_TOKEN_COOKIE = "sb_access_token";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export function resolveUserDisplayName(
  user?: StoredAuthUser | null,
): string {
  if (!user) {
    return "Kullanıcı";
  }

  try {
    const meta = user.user_metadata;
    if (meta?.full_name?.trim()) {
      return meta.full_name.trim();
    }

    const first = meta?.first_name?.trim() ?? "";
    const last = meta?.last_name?.trim() ?? "";
    const combined = `${first} ${last}`.trim();
    if (combined) {
      return combined;
    }

    if (user.email) {
      return user.email.split("@")[0] ?? "Kullanıcı";
    }
  } catch {
    return "Kullanıcı";
  }

  return "Kullanıcı";
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

function setSessionCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function setAccessTokenCookie(accessToken: string) {
  // Server Component fetch için JWT cookie (encodeURIComponent ile güvenli)
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${encodeURIComponent(accessToken)}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function clearAccessTokenCookie() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie =
    "access_token=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
}

export function persistAuthSession(accessToken: string, user?: unknown) {
  if (!accessToken || typeof accessToken !== "string") {
    return;
  }

  try {
    localStorage.setItem("access_token", accessToken);
    setSessionCookie();
    setAccessTokenCookie(accessToken);

    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }
  } catch {
    // Storage / cookie yazılamazsa sessizce devam et
  }
}

export function clearAuthSession() {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user");
  } catch {
    // ignore
  }

  try {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    clearAccessTokenCookie();
  } catch {
    // ignore
  }
}

/** localStorage token varsa session + access token cookie'lerini senkronlar. */
export function syncAuthCookiesFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const token = localStorage.getItem("access_token");
    if (token && token.trim() !== "") {
      setSessionCookie();
      setAccessTokenCookie(token);
    } else {
      document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      clearAccessTokenCookie();
    }
  } catch {
    // ignore
  }
}
