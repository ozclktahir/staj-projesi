export type StoredAuthUser = {
  email?: string;
  user_metadata?: {
    first_name?: string;
    last_name?: string;
    full_name?: string;
  };
};

export function resolveUserDisplayName(
  user?: StoredAuthUser | null,
): string {
  if (!user) {
    return "Kullanıcı";
  }

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

export function persistAuthSession(accessToken: string, user?: unknown) {
  localStorage.setItem("access_token", accessToken);
  document.cookie = `access_token=${encodeURIComponent(accessToken)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;

  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}
