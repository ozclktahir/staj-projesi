"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import {
  getCachedWorkspaceMembers,
  readWorkspaceMembers,
} from "@/lib/data-cache";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";
import type { WorkspaceMemberOption } from "@/lib/member-labels";

export type GetWorkspaceMembersResult =
  | { success: true; members: WorkspaceMemberOption[]; isAdmin: boolean }
  | { success: false; error: string; members: []; isAdmin: false };

export async function getWorkspaceMembers(
  workspaceId: string | null | undefined,
  options?: {
    /**
     * true → 5 dakikalık `unstable_cache` katmanını atlayıp doğrudan DB'den
     * okur. Üye yönetimi ekranı bunu kullanır: rol değiştirdikten sonra
     * sayfa yenilendiğinde bayat rol görünüyordu ("rol değiştirme çalışmıyor"
     * şikâyetinin asıl sebebi buydu).
     */
    fresh?: boolean;
  },
): Promise<GetWorkspaceMembersResult> {
  try {
    const wsId = workspaceId?.trim() ?? "";
    if (!wsId) {
      return {
        success: false,
        error: "Workspace kimliği zorunludur.",
        members: [],
        isAdmin: false,
      };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı.",
        members: [],
        isAdmin: false,
      };
    }

    const { supabase, user, accessToken } = auth;
    const roleCtx = await resolveWorkspaceRole(supabase, wsId, user.id);

    if (!roleCtx.isAdmin && !roleCtx.role) {
      return {
        success: false,
        error: "Bu workspace üyesi değilsiniz.",
        members: [],
        isAdmin: false,
      };
    }

    const payload = options?.fresh
      ? await readWorkspaceMembers(
          wsId,
          user.id,
          accessToken,
          roleCtx.isAdmin,
          roleCtx.isOwner,
          roleCtx.role,
        )
      : await getCachedWorkspaceMembers(
          wsId,
          user.id,
          accessToken,
          roleCtx.isAdmin,
          roleCtx.isOwner,
          roleCtx.role,
        );

    return {
      success: true,
      isAdmin: payload.isAdmin,
      members: payload.members,
    };
  } catch (error) {
    console.error("[getWorkspaceMembers] catch:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Üyeler alınamadı.",
      members: [],
      isAdmin: false,
    };
  }
}

/**
 * Üye listesi cache'ini invalid et (davet kabul / rol değişimi sonrası).
 *
 * `updateTag` = anında geçersiz kıl (read-your-own-writes); `revalidateTag(...,"max")`
 * yalnızca "bayat" işaretlediği için rol değişikliğinden sonra sayfa hâlâ eski
 * rolü gösterebiliyordu.
 */
export async function invalidateWorkspaceMembersCache(workspaceId: string) {
  const id = workspaceId?.trim();
  if (!id) return;
  try {
    updateTag(`workspace-members-${id}`);
  } catch {
    // Server Action dışından çağrıldıysa updateTag kullanılamaz
    revalidateTag(`workspace-members-${id}`, "max");
  }
  revalidatePath("/members");
}
