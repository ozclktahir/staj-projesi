import type { ProjectTask } from "@/lib/supabase/types";
import type { WorkspaceMemberOption } from "@/lib/workspace-permissions";

const TTL_MS = 45_000;

type CacheEntry<T> = { value: T; at: number };

const taskCache = new Map<string, CacheEntry<ProjectTask>>();
const membersCache = new Map<
  string,
  CacheEntry<{ members: WorkspaceMemberOption[]; isAdmin: boolean }>
>();

function isFresh(at: number): boolean {
  return Date.now() - at < TTL_MS;
}

export function getCachedTask(taskId: string): ProjectTask | null {
  const hit = taskCache.get(taskId);
  if (!hit || !isFresh(hit.at)) return null;
  return hit.value;
}

export function setCachedTask(task: ProjectTask): void {
  taskCache.set(task.id, { value: task, at: Date.now() });
}

export function invalidateCachedTask(taskId: string): void {
  taskCache.delete(taskId);
}

export function getCachedWorkspaceMembers(
  workspaceId: string,
): { members: WorkspaceMemberOption[]; isAdmin: boolean } | null {
  const hit = membersCache.get(workspaceId);
  if (!hit || !isFresh(hit.at)) return null;
  return hit.value;
}

export function setCachedWorkspaceMembers(
  workspaceId: string,
  payload: { members: WorkspaceMemberOption[]; isAdmin: boolean },
): void {
  membersCache.set(workspaceId, { value: payload, at: Date.now() });
}
