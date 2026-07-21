import { cookies } from "next/headers";

export const WORKSPACE_QUERY_KEY = "workspaceId";
export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

/** Server: URL param veya cookie'den aktif workspace */
export async function resolveActiveWorkspaceId(
  fromSearchParam?: string | null,
): Promise<string | null> {
  const fromQuery = fromSearchParam?.trim() || null;
  if (fromQuery) return fromQuery;

  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() || null;
}

/** Client: path + workspaceId query birleştir */
export function withWorkspaceQuery(
  href: string,
  workspaceId: string | null | undefined,
): string {
  if (!workspaceId) return href;
  const [path, existing] = href.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set(WORKSPACE_QUERY_KEY, workspaceId);
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}
