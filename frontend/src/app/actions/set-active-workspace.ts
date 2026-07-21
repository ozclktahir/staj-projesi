"use server";

import { cookies } from "next/headers";
import { ACTIVE_WORKSPACE_COOKIE } from "@/lib/active-workspace";

/** Aktif workspace'i HTTP cookie olarak yazar (RSC / Server Action okuyabilsin). */
export async function setActiveWorkspaceCookie(
  workspaceId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const id = workspaceId?.trim();
    if (!id) {
      return { success: false, error: "workspaceId zorunludur." };
    }

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_WORKSPACE_COOKIE, id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
    });

    return { success: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Cookie yazılamadı.";
    console.error("[setActiveWorkspaceCookie]", message);
    return { success: false, error: message };
  }
}
