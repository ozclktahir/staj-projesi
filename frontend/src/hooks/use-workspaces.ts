"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getWorkspaces,
  type WorkspaceListItem,
} from "@/app/actions/workspaces";

export const ACTIVE_WORKSPACE_KEY = "active_workspace_id";

export function readActiveWorkspaceId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

export function writeActiveWorkspaceId(id: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
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
      return;
    }

    setWorkspaces(result.workspaces);

    const stored = readActiveWorkspaceId();
    const stillValid =
      stored && result.workspaces.some((workspace) => workspace.id === stored);
    const nextId = stillValid
      ? stored
      : (result.workspaces[0]?.id ?? null);

    if (nextId) {
      writeActiveWorkspaceId(nextId);
    }
    setActiveWorkspaceId(nextId);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selectWorkspace = useCallback((id: string) => {
    writeActiveWorkspaceId(id);
    setActiveWorkspaceId(id);
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
  };
}
