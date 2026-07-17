import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";
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

function setProxySessionCookie() {
  document.cookie = `${AUTH_COOKIE}=1; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function setTokenCookies(accessToken: string, refreshToken?: string | null) {
  // JWT'yi encode etmeden yaz (Next cookie decode ile çift bozulmayı önle)
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  if (refreshToken) {
    document.cookie = `${REFRESH_TOKEN_COOKIE}=${refreshToken}; path=/; max-age=${SESSION_MAX_AGE_SECONDS}; SameSite=Lax`;
  }
}

function clearTokenCookies() {
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie = `${REFRESH_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  document.cookie =
    "access_token=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT";
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
    localStorage.setItem("access_token", accessToken);
    if (refreshToken) {
      localStorage.setItem("refresh_token", refreshToken);
    }
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    }

    setProxySessionCookie();
    setTokenCookies(accessToken, refreshToken);

    // @supabase/ssr cookie'lerini de yaz (RLS / getUser için asıl kaynak)
    if (refreshToken) {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) {
        console.warn("Supabase setSession başarısız:", error.message);
      }
    }
  } catch {
    // Storage / cookie yazılamazsa sessizce devam et
  }
}

export async function clearAuthSession() {
  try {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  } catch {
    // ignore
  }

  try {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    clearTokenCookies();
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore
  }
}

/** localStorage token varsa cookie + supabase session senkronlar. */
export async function syncAuthCookiesFromStorage() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const accessToken = localStorage.getItem("access_token");
    const refreshToken = localStorage.getItem("refresh_token");

    if (!accessToken || accessToken.trim() === "") {
      document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
      clearTokenCookies();
      return;
    }

    setProxySessionCookie();
    setTokenCookies(accessToken, refreshToken);

    if (refreshToken) {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  } catch {
    // ignore
  }
}
