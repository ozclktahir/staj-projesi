/** Client + Server güvenli sabitler ve yardımcılar (next/headers YOK). */

export const WORKSPACE_QUERY_KEY = "workspaceId";
export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

/** Path + workspaceId query birleştir */
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
