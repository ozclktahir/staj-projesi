"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/rbac";
import {
  loadProfilesByIds,
  resolveMemberDisplayFields,
} from "@/lib/member-labels";
import {
  normalizeTaskStatusInput,
  type TaskStatus,
} from "@/lib/supabase/types";

export type AdminMemberOverview = {
  userId: string;
  email: string | null;
  displayName: string;
  role: string;
  projectNames: string[];
  tasksDone: number;
  tasksInProgress: number;
  tasksTodo: number;
};

export type AdminOverviewResult =
  | {
      success: true;
      isAdmin: boolean;
      members: AdminMemberOverview[];
    }
  | { success: false; error: string; isAdmin: boolean; members: [] };

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
    return "Admin özeti alınamadı.";
  }
}

export async function getAdminOverview(
  workspaceId: string | null | undefined,
): Promise<AdminOverviewResult> {
  try {
    const wsId = workspaceId?.trim() ?? "";
    if (!wsId) {
      return {
        success: true,
        isAdmin: false,
        members: [],
      };
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return {
        success: false,
        error: "Oturum bulunamadı.",
        isAdmin: false,
        members: [],
      };
    }

    const { supabase, user } = auth;

    const { data: owned } = await supabase
      .from("workspaces")
      .select("id")
      .eq("id", wsId)
      .eq("owner_id", user.id)
      .maybeSingle();

    const { data: membership } = await supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", wsId)
      .eq("user_id", user.id)
      .maybeSingle();

    const role = owned
      ? "OWNER"
      : ((membership?.role as string | undefined) ?? null);

    if (!isAdminRole(role)) {
      return { success: true, isAdmin: false, members: [] };
    }

    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select("user_id, role")
      .eq("workspace_id", wsId);

    if (membersError) {
      console.error("[getAdminOverview] members:", membersError);
      return {
        success: false,
        error: toPlainErrorMessage(membersError),
        isAdmin: true,
        members: [],
      };
    }

    const memberRows = members ?? [];
    const userIds = memberRows
      .map((m) => m.user_id as string)
      .filter(Boolean);

    // Owner üye satırında yoksa ekle
    if (owned && !userIds.includes(user.id)) {
      userIds.push(user.id);
      memberRows.push({ user_id: user.id, role: "OWNER" });
    }

    const profileById = await loadProfilesByIds(supabase, userIds);

    const { data: projects } = await supabase
      .from("projects")
      .select("id, name, user_id, created_by")
      .eq("workspace_id", wsId);

    const projectsByUser = new Map<string, string[]>();
    for (const project of projects ?? []) {
      const owners = [
        typeof project.user_id === "string" ? project.user_id : null,
        typeof project.created_by === "string" ? project.created_by : null,
      ].filter(Boolean) as string[];
      for (const uid of owners) {
        const list = projectsByUser.get(uid) ?? [];
        if (typeof project.name === "string" && !list.includes(project.name)) {
          list.push(project.name);
        }
        projectsByUser.set(uid, list);
      }
    }

    const { data: tasks } = await supabase
      .from("tasks")
      .select("status, created_by, user_id, assignee_id")
      .eq("workspace_id", wsId)
      .is("deleted_at", null);

    type Counts = { done: number; inProgress: number; todo: number };
    const taskCounts = new Map<string, Counts>();

    for (const task of tasks ?? []) {
      const status = (normalizeTaskStatusInput(task.status) ??
        "TODO") as TaskStatus;
      const owners = [
        typeof task.assignee_id === "string" ? task.assignee_id : null,
        typeof task.user_id === "string" ? task.user_id : null,
        typeof task.created_by === "string" ? task.created_by : null,
      ].filter(Boolean) as string[];

      const uniqueOwners = [...new Set(owners)];
      for (const uid of uniqueOwners) {
        const entry = taskCounts.get(uid) ?? {
          done: 0,
          inProgress: 0,
          todo: 0,
        };
        if (status === "DONE") entry.done += 1;
        else if (status === "IN_PROGRESS") entry.inProgress += 1;
        else entry.todo += 1;
        taskCounts.set(uid, entry);
      }
    }

    const overview: AdminMemberOverview[] = memberRows.map((m) => {
      const uid = m.user_id as string;
      const profile = profileById.get(uid) ?? null;
      const emailHint = uid === user.id ? (user.email ?? null) : null;
      const fields = resolveMemberDisplayFields(profile, emailHint);
      const counts = taskCounts.get(uid) ?? {
        done: 0,
        inProgress: 0,
        todo: 0,
      };

      return {
        userId: uid,
        email: fields.email,
        displayName: fields.displayName,
        role: (m.role as string) ?? "Member",
        projectNames: projectsByUser.get(uid) ?? [],
        tasksDone: counts.done,
        tasksInProgress: counts.inProgress,
        tasksTodo: counts.todo,
      };
    });

    return { success: true, isAdmin: true, members: overview };
  } catch (error) {
    console.error("[getAdminOverview] catch:", toPlainErrorMessage(error));
    return {
      success: false,
      error: toPlainErrorMessage(error),
      isAdmin: false,
      members: [],
    };
  }
}
