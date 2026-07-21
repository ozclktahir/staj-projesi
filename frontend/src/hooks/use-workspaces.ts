"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setActiveWorkspaceCookie } from "@/app/actions/set-active-workspace";
import {
  getWorkspaces,
  type WorkspaceListItem,
} from "@/app/actions/workspaces";
import {
  ACTIVE_WORKSPACE_COOKIE,
  WORKSPACE_QUERY_KEY,
  withWorkspaceQuery,
} from "@/lib/active-workspace";

export const ACTIVE_WORKSPACE_KEY = "active_workspace_id";

function decodeCookieValue(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return raw.trim() || null;
  }
}

export function readActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = localStorage.getItem(ACTIVE_WORKSPACE_KEY)?.trim();
    if (fromLs) return fromLs;
  } catch {
    // ignore
  }
  try {
    const match = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${ACTIVE_WORKSPACE_COOKIE}=`));
    if (match) {
      return decodeCookieValue(match.split("=").slice(1).join("="));
    }
  } catch {
    // ignore
  }
  return null;
}

/** localStorage + document.cookie + server cookie (Server Action) */
export function writeActiveWorkspaceId(id: string) {
  if (typeof window === "undefined") return;
  const clean = id.trim();
  if (!clean) return;

  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, clean);
  } catch {
    // ignore
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${encodeURIComponent(clean)}; path=/; max-age=${maxAge}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function clearActiveWorkspaceId() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    // ignore
  }
  try {
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function useWorkspaces() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlWorkspaceId = searchParams.get(WORKSPACE_QUERY_KEY);

  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    urlWorkspaceId,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const persistAndNavigate = useCallback(
    async (id: string) => {
      const clean = id.trim();
      if (!clean) return;

      writeActiveWorkspaceId(clean);
      setActiveWorkspaceId(clean);

      const cookieResult = await setActiveWorkspaceCookie(clean);
      if (!cookieResult.success) {
        console.error(
          "[useWorkspaces] setActiveWorkspaceCookie failed:",
          cookieResult.error,
        );
      }

      const targetPath = pathname.startsWith("/project/")
        ? "/"
        : pathname || "/";
      const href = withWorkspaceQuery(targetPath, clean);
      console.info("[useWorkspaces] switch workspace", { clean, href });
      router.push(href);
      router.refresh();
    },
    [pathname, router],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getWorkspaces();
    if (!result.success) {
      setWorkspaces([]);
      setError(result.error);
      setLoading(false);
      return [] as WorkspaceListItem[];
    }

    const list = Array.isArray(result.workspaces) ? result.workspaces : [];
    setWorkspaces(list);

    const fromUrl = urlWorkspaceId?.trim() || null;
    const stored = readActiveWorkspaceId();
    const preferred = fromUrl || stored;
    const stillValid =
      preferred && list.some((workspace) => workspace.id === preferred);
    const nextId = stillValid ? preferred : (list[0]?.id ?? null);

    if (nextId) {
      writeActiveWorkspaceId(nextId);
      setActiveWorkspaceId(nextId);
      void setActiveWorkspaceCookie(nextId);
      if (!fromUrl) {
        router.replace(withWorkspaceQuery(pathname || "/", nextId));
      }
    } else {
      setActiveWorkspaceId(null);
    }

    setLoading(false);
    return list;
  }, [pathname, router, urlWorkspaceId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (urlWorkspaceId) {
      writeActiveWorkspaceId(urlWorkspaceId);
      setActiveWorkspaceId(urlWorkspaceId);
      void setActiveWorkspaceCookie(urlWorkspaceId);
    }
  }, [urlWorkspaceId]);

  const selectWorkspace = useCallback(
    (id: string) => {
      void persistAndNavigate(id);
    },
    [persistAndNavigate],
  );

  const upsertWorkspace = useCallback(
    (workspace: WorkspaceListItem) => {
      setWorkspaces((prev) => {
        const without = prev.filter((item) => item.id !== workspace.id);
        return [workspace, ...without];
      });
      void persistAndNavigate(workspace.id);
    },
    [persistAndNavigate],
  );

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    loading,
    error,
    refresh,
    selectWorkspace,
    upsertWorkspace,
  };
}
