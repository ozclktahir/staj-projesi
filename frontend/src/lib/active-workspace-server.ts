import { cookies } from "next/headers";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

/** Server-only: URL param veya cookie'den aktif workspace */
export async function resolveActiveWorkspaceId(
  fromSearchParam?: string | null,
): Promise<string | null> {
  const fromQuery = fromSearchParam?.trim() || null;
  if (fromQuery) return fromQuery;

  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value;
  if (!raw) return null;
  try {
    return decodeURIComponent(raw).trim() || null;
  } catch {
    return raw.trim() || null;
  }
}
