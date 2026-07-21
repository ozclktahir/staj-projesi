import { cookies } from "next/headers";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

/** Server-only: URL param veya cookie'den aktif workspace */
export async function resolveActiveWorkspaceId(
  fromSearchParam?: string | null,
): Promise<string | null> {
  const fromQuery = fromSearchParam?.trim() || null;
  if (fromQuery) return fromQuery;

  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value?.trim() || null;
}
