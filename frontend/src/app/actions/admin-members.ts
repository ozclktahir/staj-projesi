"use server";

import { revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-session";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { resolveWorkspaceRole } from "@/lib/workspace-permissions";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ||
  "http://localhost:3000";

async function getBearerToken(): Promise<string | null> {
  const jar = await cookies();
  const fromCookie = jar.get(ACCESS_TOKEN_COOKIE)?.value?.trim();
  if (fromCookie) return fromCookie;
  const auth = await getAuthenticatedUser();
  return auth?.accessToken ?? null;
}

export async function removeWorkspaceMember(params: {
  workspaceId: string;
  userId: string;
}): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const workspaceId = params.workspaceId.trim();
    const userId = params.userId.trim();
    if (!workspaceId || !userId) {
      return { success: false, error: "Eksik parametre." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const roleCtx = await resolveWorkspaceRole(
      auth.supabase,
      workspaceId,
      auth.user.id,
    );
    if (!roleCtx.isAdmin) {
      return { success: false, error: "Bu işlem için Admin yetkisi gerekir." };
    }

    const token = await getBearerToken();
    if (!token) return { success: false, error: "Token bulunamadı." };

    const res = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/admin/users/${userId}/remove`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        cache: "no-store",
      },
    );

    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    if (!res.ok) {
      const msg = body?.message;
      return {
        success: false,
        error: Array.isArray(msg)
          ? msg.join(", ")
          : typeof msg === "string"
            ? msg
            : "Üye kaldırılamadı.",
      };
    }

    updateTag(`workspace-members-${workspaceId}`);
    revalidatePath("/members");
    revalidatePath("/");
    return {
      success: true,
      message: body?.message
        ? Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message
        : "Üye kaldırıldı.",
    };
  } catch (error) {
    console.error("[removeWorkspaceMember]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Üye kaldırılamadı.",
    };
  }
}

export async function updateWorkspaceMemberRole(params: {
  workspaceId: string;
  userId: string;
  role: "Admin" | "Member";
}): Promise<{ success: true; message: string } | { success: false; error: string }> {
  try {
    const workspaceId = params.workspaceId.trim();
    const userId = params.userId.trim();
    if (!workspaceId || !userId) {
      return { success: false, error: "Eksik parametre." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) return { success: false, error: "Oturum bulunamadı." };

    const roleCtx = await resolveWorkspaceRole(
      auth.supabase,
      workspaceId,
      auth.user.id,
    );
    if (!roleCtx.isAdmin) {
      return { success: false, error: "Bu işlem için Admin yetkisi gerekir." };
    }

    const token = await getBearerToken();
    if (!token) return { success: false, error: "Token bulunamadı." };

    const res = await fetch(
      `${API_BASE}/workspaces/${workspaceId}/admin/users/${userId}/role`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ role: params.role }),
        cache: "no-store",
      },
    );

    const body = (await res.json().catch(() => null)) as
      | { message?: string | string[] }
      | null;

    if (!res.ok) {
      const msg = body?.message;
      return {
        success: false,
        error: Array.isArray(msg)
          ? msg.join(", ")
          : typeof msg === "string"
            ? msg
            : "Rol güncellenemedi.",
      };
    }

    updateTag(`workspace-members-${workspaceId}`);
    revalidatePath("/members");
    revalidatePath("/");
    return {
      success: true,
      message: body?.message
        ? Array.isArray(body.message)
          ? body.message.join(", ")
          : body.message
        : "Rol güncellendi.",
    };
  } catch (error) {
    console.error("[updateWorkspaceMemberRole]", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Rol güncellenemedi.",
    };
  }
}
