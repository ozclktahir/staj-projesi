"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

export function readActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

/** localStorage + cookie (Server Action / RSC okuyabilsin diye) */
export function writeActiveWorkspaceId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
  } catch {
    // ignore
  }
  try {
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${encodeURIComponent(id)}; path=/; max-age=${maxAge}; SameSite=Lax`;
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

  const navigateWithWorkspace = useCallback(
    (id: string) => {
      writeActiveWorkspaceId(id);
      setActiveWorkspaceId(id);

      // Proje detayındaysak başka workspace'e geçince dashboard'a dön
      if (pathname.startsWith("/project/")) {
        router.push(withWorkspaceQuery("/", id));
        return;
      }

      router.push(withWorkspaceQuery(pathname || "/", id));
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
      // URL'de yoksa ekle (ilk yükleme)
      if (!fromUrl && nextId) {
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

  // URL değişince aktif id'yi senkronla
  useEffect(() => {
    if (urlWorkspaceId) {
      writeActiveWorkspaceId(urlWorkspaceId);
      setActiveWorkspaceId(urlWorkspaceId);
    }
  }, [urlWorkspaceId]);

  const selectWorkspace = useCallback(
    (id: string) => {
      navigateWithWorkspace(id);
    },
    [navigateWithWorkspace],
  );

  const upsertWorkspace = useCallback(
    (workspace: WorkspaceListItem) => {
      setWorkspaces((prev) => {
        const without = prev.filter((item) => item.id !== workspace.id);
        return [workspace, ...without];
      });
      navigateWithWorkspace(workspace.id);
    },
    [navigateWithWorkspace],
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
