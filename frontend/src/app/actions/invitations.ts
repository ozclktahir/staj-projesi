"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/rbac";

export type CreateInvitationInput = {
  workspaceId: string;
  email: string;
  role?: "Member" | "Admin" | "Guest";
};

export type CreateInvitationResult =
  | { success: true; invitationId: string }
  | { success: false; error: string };

export type AcceptInvitationsResult =
  | { success: true; acceptedCount: number; workspaceIds: string[] }
  | { success: false; error: string };

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Davet işlemi başarısız.";
  }
}

async function assertWorkspaceAdmin(
  supabase: SupabaseClient,
  workspaceId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: owned } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", workspaceId)
    .eq("owner_id", userId)
    .maybeSingle();

  if (owned?.id) return { ok: true };

  const { data: membership, error } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error: toPlainErrorMessage(error) };
  }

  if (!membership || !isAdminRole(membership.role as string)) {
    return {
      ok: false,
      error: "Üye davet etmek için Admin / Owner yetkisi gerekir.",
    };
  }

  return { ok: true };
}

export async function createInvitation(
  input: CreateInvitationInput,
): Promise<CreateInvitationResult> {
  try {
    const workspaceId = input.workspaceId?.trim() ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    const role = input.role ?? "Member";

    if (!workspaceId) {
      return { success: false, error: "Workspace kimliği zorunludur." };
    }
    if (!email || !email.includes("@")) {
      return { success: false, error: "Geçerli bir e-posta girin." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const gate = await assertWorkspaceAdmin(supabase, workspaceId, user.id);
    if (!gate.ok) {
      return { success: false, error: gate.error };
    }

    console.log("[createInvitation]", { workspaceId, email, role });

    const { data: inviteeProfileEarly } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .ilike("email", email)
      .maybeSingle();

    let { data, error } = await supabase
      .from("workspace_invitations")
      .insert({
        workspace_id: workspaceId,
        email,
        role,
        invited_by: user.id,
        invited_user_id: (inviteeProfileEarly?.id as string) ?? null,
        status: "pending",
      })
      .select("id")
      .single();

    // invited_user_id sütunu yoksa tekrar dene
    if (
      error &&
      (error.message.includes("invited_user_id") ||
        error.message.includes("schema cache") ||
        error.message.includes("column"))
    ) {
      ({ data, error } = await supabase
        .from("workspace_invitations")
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user.id,
          status: "pending",
        })
        .select("id")
        .single());
    }

    // Alternatif tablo adı: invitations
    if (error?.message?.toLowerCase().includes("workspace_invitations")) {
      ({ data, error } = await supabase
        .from("invitations")
        .insert({
          workspace_id: workspaceId,
          email,
          role,
          invited_by: user.id,
          status: "pending",
        })
        .select("id")
        .single());
    }

    if (error || !data) {
      console.error("[createInvitation]", error);
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Davet oluşturulamadı."),
      };
    }

    const invitationId = data.id as string;

    const { data: workspace } = await supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .maybeSingle();

    const inviteeProfile = inviteeProfileEarly;

    if (inviteeProfile?.id) {
      const { createInviteNotification } = await import(
        "@/app/actions/notifications"
      );
      const inviterName =
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name) ||
        user.email ||
        "Bir yönetici";

      await createInviteNotification({
        workspaceId,
        workspaceName: (workspace?.name as string) ?? "Workspace",
        inviteeUserId: inviteeProfile.id as string,
        invitationId,
        invitedByName: inviterName,
      });
    }

    revalidatePath("/");
    return { success: true, invitationId };
  } catch (error) {
    console.error("[createInvitation] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

/**
 * Bekleyen davetleri e-posta eşleşmesiyle kabul eder → workspace_members MEMBER.
 * Login / dashboard girişi sonrası çağrılır.
 */
export async function acceptPendingInvitations(): Promise<AcceptInvitationsResult> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const email = user.email?.toLowerCase().trim();
    if (!email) {
      return { success: true, acceptedCount: 0, workspaceIds: [] };
    }

    let invitationsQuery = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, status")
      .ilike("email", email)
      .in("status", ["PENDING", "pending"]);

    if (invitationsQuery.error?.message?.includes("workspace_invitations")) {
      invitationsQuery = await supabase
        .from("invitations")
        .select("id, workspace_id, email, role, status")
        .ilike("email", email)
        .in("status", ["PENDING", "pending"]);
    }

    if (invitationsQuery.error) {
      console.error(
        "[acceptPendingInvitations] list:",
        invitationsQuery.error,
      );
      return {
        success: false,
        error: toPlainErrorMessage(invitationsQuery.error),
      };
    }

    const pending = invitationsQuery.data ?? [];
    const workspaceIds: string[] = [];

    for (const invitation of pending) {
      const workspaceId = invitation.workspace_id as string;
      const invitationId = invitation.id as string;
      const memberRole =
        typeof invitation.role === "string" && invitation.role.trim()
          ? invitation.role === "Admin" || invitation.role === "OWNER"
            ? invitation.role
            : "Member"
          : "Member";

      const { data: existing } = await supabase
        .from("workspace_members")
        .select("user_id")
        .eq("workspace_id", workspaceId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!existing) {
        const { error: memberError } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            role: memberRole === "OWNER" ? "Admin" : memberRole,
          });

        if (memberError) {
          console.error(
            "[acceptPendingInvitations] member insert:",
            memberError,
          );
          continue;
        }
      }

      let { error: updateError } = await supabase
        .from("workspace_invitations")
        .update({ status: "accepted" })
        .eq("id", invitationId);

      if (updateError?.message?.includes("workspace_invitations")) {
        ({ error: updateError } = await supabase
          .from("invitations")
          .update({ status: "accepted" })
          .eq("id", invitationId));
      }

      if (updateError) {
        console.warn(
          "[acceptPendingInvitations] status update:",
          updateError.message,
        );
      }

      workspaceIds.push(workspaceId);
      console.log("[acceptPendingInvitations] accepted", {
        invitationId,
        workspaceId,
      });
    }

    if (workspaceIds.length > 0) {
      revalidatePath("/");
      revalidatePath("/onboarding");
      revalidatePath("/unauthorized");
    }

    return {
      success: true,
      acceptedCount: workspaceIds.length,
      workspaceIds,
    };
  } catch (error) {
    console.error(
      "[acceptPendingInvitations] catch:",
      toPlainErrorMessage(error),
    );
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

/** Tek davet ID ile kabul (API uyumu). */
export async function acceptInvitation(
  invitationId: string,
): Promise<AcceptInvitationsResult> {
  try {
    const id = invitationId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Davet kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const email = user.email?.toLowerCase().trim() ?? "";

    let { data: invitation, error } = await supabase
      .from("workspace_invitations")
      .select("id, workspace_id, email, role, status")
      .eq("id", id)
      .maybeSingle();

    if (error?.message?.includes("workspace_invitations")) {
      ({ data: invitation, error } = await supabase
        .from("invitations")
        .select("id, workspace_id, email, role, status")
        .eq("id", id)
        .maybeSingle());
    }

    if (error || !invitation) {
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Davet bulunamadı."),
      };
    }

    const statusUpper = String(invitation.status ?? "").toUpperCase();
    if (statusUpper === "ACCEPTED") {
      return { success: true, acceptedCount: 0, workspaceIds: [] };
    }
    if (statusUpper === "REJECTED" || statusUpper === "DECLINED") {
      return { success: false, error: "Bu davet reddedilmiş." };
    }

    const inviteEmail = String(invitation.email ?? "")
      .toLowerCase()
      .trim();
    if (!email || email !== inviteEmail) {
      return {
        success: false,
        error: "Bu davet sizin e-posta adresinize ait değil.",
      };
    }

    const workspaceId = invitation.workspace_id as string;
    const { data: existing } = await supabase
      .from("workspace_members")
      .select("user_id")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!existing) {
      const invitedRole =
        typeof invitation.role === "string" && invitation.role.trim()
          ? invitation.role === "OWNER"
            ? "Admin"
            : invitation.role
          : "Member";
      const { error: memberError } = await supabase
        .from("workspace_members")
        .insert({
          workspace_id: workspaceId,
          user_id: user.id,
          role: invitedRole,
        });
      if (memberError) {
        return { success: false, error: toPlainErrorMessage(memberError) };
      }
    }

    await supabase
      .from("workspace_invitations")
      .update({ status: "accepted" })
      .eq("id", id);

    // İlgili invite bildirimlerini okundu yap
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("type", ["WORKSPACE_INVITE", "workspace_invite"])
        .contains("metadata", { invitation_id: id });
    } catch {
      // notifications tablosu yoksa yoksay
    }
    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("type", ["WORKSPACE_INVITE", "workspace_invite"])
        .contains("payload", { invitation_id: id });
    } catch {
      // ignore
    }

    revalidatePath("/");
    revalidatePath("/onboarding");
    return {
      success: true,
      acceptedCount: 1,
      workspaceIds: [workspaceId],
    };
  } catch (error) {
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export type DeclineInvitationResult =
  | { success: true }
  | { success: false; error: string };

/** Daveti reddet → status rejected + ilgili bildirim okundu. */
export async function declineInvitation(
  invitationId: string,
): Promise<DeclineInvitationResult> {
  try {
    const id = invitationId?.trim() ?? "";
    if (!id) {
      return { success: false, error: "Davet kimliği zorunludur." };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const { supabase, user } = auth;
    const email = user.email?.toLowerCase().trim() ?? "";

    let { data: invitation, error } = await supabase
      .from("workspace_invitations")
      .select("id, email, status, invited_user_id")
      .eq("id", id)
      .maybeSingle();

    if (error?.message?.includes("workspace_invitations")) {
      ({ data: invitation, error } = await supabase
        .from("invitations")
        .select("id, email, status")
        .eq("id", id)
        .maybeSingle());
    }

    if (error || !invitation) {
      return {
        success: false,
        error: toPlainErrorMessage(error ?? "Davet bulunamadı."),
      };
    }

    const inviteEmail = String(invitation.email ?? "")
      .toLowerCase()
      .trim();
    const invitedUserId =
      "invited_user_id" in invitation
        ? (invitation.invited_user_id as string | null)
        : null;

    const ownsInvite =
      (email && inviteEmail && email === inviteEmail) ||
      invitedUserId === user.id;

    if (!ownsInvite) {
      return {
        success: false,
        error: "Bu davet sizin e-posta adresinize ait değil.",
      };
    }

    let { error: updateError } = await supabase
      .from("workspace_invitations")
      .update({ status: "rejected" })
      .eq("id", id);

    if (updateError?.message?.includes("workspace_invitations")) {
      ({ error: updateError } = await supabase
        .from("invitations")
        .update({ status: "rejected" })
        .eq("id", id));
    }

    if (updateError) {
      return { success: false, error: toPlainErrorMessage(updateError) };
    }

    try {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .in("type", ["WORKSPACE_INVITE", "workspace_invite"])
        .contains("metadata", { invitation_id: id });
    } catch {
      // ignore
    }

    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
