"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { setActiveWorkspaceCookie, clearActiveWorkspaceCookie } from "@/app/actions/set-active-workspace";
import {
  getWorkspaces,
  type WorkspaceListItem,
} from "@/app/actions/workspaces";
import {
  ACTIVE_WORKSPACE_COOKIE,
  WORKSPACE_QUERY_KEY,
  withWorkspaceQuery,
} from "@/lib/active-workspace";
import { pickDefaultAdminWorkspace } from "@/lib/member-labels";

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

/**
 * Aktif workspace seçimi yalnızca hangi projelerin gösterileceğini belirler.
 * Dropdown listesi (workspaces[]) ASLA aktif filtreyle küçültülmez.
 */
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

  const workspacesRef = useRef(workspaces);
  workspacesRef.current = workspaces;

  const persistActiveOnly = useCallback(async (id: string) => {
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
  }, []);

  const persistAndNavigate = useCallback(
    async (id: string) => {
      const clean = id.trim();
      if (!clean) return;

      // Listeye dokunma — sadece aktif seçim + URL
      await persistActiveOnly(clean);

      const targetPath = pathname.startsWith("/project/")
        ? "/"
        : pathname || "/";
      const href = withWorkspaceQuery(targetPath, clean);
      console.info("[useWorkspaces] switch workspace (list unchanged)", {
        clean,
        href,
        listCount: workspacesRef.current.length,
      });
      router.push(href);
      router.refresh();
    },
    [pathname, persistActiveOnly, router],
  );

  const resolvePreferredId = useCallback(
    (list: WorkspaceListItem[]) => {
      const fromUrl = urlWorkspaceId?.trim() || null;
      const stored = readActiveWorkspaceId();
      const preferred = fromUrl || stored || activeWorkspaceId;
      const stillValid =
        preferred && list.some((workspace) => workspace.id === preferred);
      if (stillValid) return preferred;

      // Varsayılan: Admin olduğu workspace
      const adminDefault = pickDefaultAdminWorkspace(list);
      return adminDefault?.id ?? list[0]?.id ?? null;
    },
    [activeWorkspaceId, urlWorkspaceId],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await getWorkspaces();
    if (!result.success) {
      // Mevcut listeyi silme — geçici hata dropdown'u boşaltmasın
      console.error("[useWorkspaces] getWorkspaces failed:", result.error);
      setError(result.error);
      setLoading(false);
      return workspacesRef.current;
    }

    const list = Array.isArray(result.workspaces) ? result.workspaces : [];
    console.info("[useWorkspaces] full workspace list", {
      count: list.length,
      ids: list.map((w) => w.id),
    });

    // Tam listeyi yaz — aktif id ile filtreleme YOK
    setWorkspaces(list);

    const nextId = resolvePreferredId(list);
    if (nextId) {
      writeActiveWorkspaceId(nextId);
      setActiveWorkspaceId(nextId);
      void setActiveWorkspaceCookie(nextId);
      if (!urlWorkspaceId) {
        router.replace(withWorkspaceQuery(pathname || "/", nextId));
      }
    }

    setLoading(false);
    return list;
  }, [pathname, resolvePreferredId, router, urlWorkspaceId]);

  // İlk yükleme — URL değişiminde listeyi yeniden sıfırlama
  const initialLoadDone = useRef(false);
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
  }, []);

  // URL'deki workspaceId değişince SADECE aktif seçimi güncelle (listeyi değil)
  useEffect(() => {
    if (!urlWorkspaceId) return;
    if (urlWorkspaceId === activeWorkspaceId) return;

    writeActiveWorkspaceId(urlWorkspaceId);
    setActiveWorkspaceId(urlWorkspaceId);
    void setActiveWorkspaceCookie(urlWorkspaceId);
  }, [urlWorkspaceId, activeWorkspaceId]);

  const selectWorkspace = useCallback(
    (id: string) => {
      // workspaces[] dokunulmaz
      void persistAndNavigate(id);
    },
    [persistAndNavigate],
  );

  const upsertWorkspace = useCallback(
    (workspace: WorkspaceListItem) => {
      setWorkspaces((prev) => {
        const without = prev.filter((item) => item.id !== workspace.id);
        // Mevcut liste korunur; yeni workspace eklenir
        return [workspace, ...without];
      });
      void persistAndNavigate(workspace.id);
    },
    [persistAndNavigate],
  );

  /** Silme sonrası liste + aktif seçim güncellemesi */
  const afterWorkspaceDeleted = useCallback(
    async (deletedId: string, nextWorkspaceId: string | null) => {
      const remaining = workspacesRef.current.filter((w) => w.id !== deletedId);
      setWorkspaces(remaining);

      const wasActive = activeWorkspaceId === deletedId;
      const fallbackId =
        nextWorkspaceId && remaining.some((w) => w.id === nextWorkspaceId)
          ? nextWorkspaceId
          : (remaining[0]?.id ?? null);

      if (wasActive || !fallbackId) {
        if (fallbackId) {
          await persistAndNavigate(fallbackId);
        } else {
          clearActiveWorkspaceId();
          setActiveWorkspaceId(null);
          await clearActiveWorkspaceCookie();
          router.push(pathname || "/");
          router.refresh();
        }
      } else {
        router.refresh();
      }

      // Sunucu listesiyle senkron
      void refresh();
    },
    [activeWorkspaceId, pathname, persistAndNavigate, refresh, router],
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
    afterWorkspaceDeleted,
  };
}
