"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWorkspaces,
  type WorkspaceListItem,
} from "@/app/actions/workspaces";

export const ACTIVE_WORKSPACE_KEY = "active_workspace_id";
export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

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
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    // Backend doğrudan dizi döner; { data: [...] } wrapper yok
    const list = Array.isArray(result.workspaces) ? result.workspaces : [];
    setWorkspaces(list);

    const stored = readActiveWorkspaceId();
    const stillValid =
      stored && list.some((workspace) => workspace.id === stored);
    const nextId = stillValid ? stored : (list[0]?.id ?? null);

    if (nextId) {
      writeActiveWorkspaceId(nextId);
    }
    setActiveWorkspaceId(nextId);
    setLoading(false);
    return list;
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectWorkspace = useCallback((id: string) => {
    writeActiveWorkspaceId(id);
    setActiveWorkspaceId(id);
  }, []);

  /** createWorkspace sonrası state'i anında güncelle */
  const upsertWorkspace = useCallback((workspace: WorkspaceListItem) => {
    setWorkspaces((prev) => {
      const without = prev.filter((item) => item.id !== workspace.id);
      return [workspace, ...without];
    });
    writeActiveWorkspaceId(workspace.id);
    setActiveWorkspaceId(workspace.id);
  }, []);

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
