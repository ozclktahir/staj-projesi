"use server";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-session";
import type { WorkspaceListItem } from "@/lib/supabase/types";

export type { WorkspaceListItem } from "@/lib/supabase/types";

export type GetWorkspacesResult =
  | { success: true; workspaces: WorkspaceListItem[] }
  | { success: false; error: string };

export type CreateWorkspaceInput = {
  name: string;
  description?: string;
};

export type CreateWorkspaceResult =
  | { success: true; workspace: WorkspaceListItem }
  | { success: false; error: string };

const WORKSPACE_SELECT =
  "id, name, description, owner_id, created_at, updated_at";
const WORKSPACE_SELECT_LEGACY =
  "id, name, description, owner_id, created_at";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
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
    return "Beklenmeyen bir hata oluştu.";
  }
}

function createUserScopedClient(
  url: string,
  anonKey: string,
  accessToken: string,
): SupabaseClient {
  return createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/** Backend/Supabase satırını düz WorkspaceListItem'a çevirir (wrapper yok). */
export async function mapWorkspaceRow(
  row: Record<string, unknown>,
  role?: string | null,
): Promise<WorkspaceListItem | null> {
  const source =
    row.data && typeof row.data === "object" && !Array.isArray(row.data)
      ? (row.data as Record<string, unknown>)
      : row;

  if (typeof source.id !== "string" || typeof source.name !== "string") {
    return null;
  }

  return {
    id: source.id,
    name: source.name,
    description:
      typeof source.description === "string" ? source.description : null,
    owner_id: typeof source.owner_id === "string" ? source.owner_id : null,
    role: role ?? (typeof source.role === "string" ? source.role : null),
    created_at:
      typeof source.created_at === "string" ? source.created_at : null,
    updated_at:
      typeof source.updated_at === "string" ? source.updated_at : null,
  };
}

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return (
    cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ||
    cookieStore.get("access_token")?.value ||
    null
  );
}

/**
 * Kullanıcının TÜM workspace'lerini döner.
 * ASLA active_workspace_id ile filtrelenmez.
 * Kaynak: owner_id == user.id  VEYA  workspace_members.user_id == user.id
 */
export async function getWorkspaces(): Promise<GetWorkspacesResult> {
  try {
    const env = getSupabaseEnv();
    if (!env) {
      return {
        success: false,
        error:
          "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
      };
    }

    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const supabase = createUserScopedClient(env.url, env.anonKey, token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const authUid = user.id;
    console.log("[getWorkspaces] listing ALL workspaces for user", authUid);

    // 1) Sahip olunan workspace'ler (üyelik satırı eksik olsa bile)
    let ownedQuery = await supabase
      .from("workspaces")
      .select(WORKSPACE_SELECT)
      .eq("owner_id", authUid);

    if (
      ownedQuery.error &&
      toPlainErrorMessage(ownedQuery.error).includes("updated_at")
    ) {
      ownedQuery = await supabase
        .from("workspaces")
        .select(WORKSPACE_SELECT_LEGACY)
        .eq("owner_id", authUid);
    }

    if (ownedQuery.error) {
      console.error("[getWorkspaces] owned query:", ownedQuery.error);
      return {
        success: false,
        error: toPlainErrorMessage(ownedQuery.error),
      };
    }

    // 2) Üye olunan workspace'ler (aktif filtre YOK)
    let memberQuery = await supabase
      .from("workspace_members")
      .select(`role, workspaces(${WORKSPACE_SELECT})`)
      .eq("user_id", authUid);

    if (
      memberQuery.error &&
      toPlainErrorMessage(memberQuery.error).includes("updated_at")
    ) {
      memberQuery = await supabase
        .from("workspace_members")
        .select(`role, workspaces(${WORKSPACE_SELECT_LEGACY})`)
        .eq("user_id", authUid);
    }

    if (memberQuery.error) {
      console.error("[getWorkspaces] members query:", memberQuery.error);
      return {
        success: false,
        error: toPlainErrorMessage(memberQuery.error),
      };
    }

    const byId = new Map<string, WorkspaceListItem>();

    for (const row of ownedQuery.data ?? []) {
      if (!row || typeof row !== "object") continue;
      const mapped = await mapWorkspaceRow(
        row as Record<string, unknown>,
        "OWNER",
      );
      if (mapped) byId.set(mapped.id, mapped);
    }

    for (const mapped of await normalizeMemberRows(memberQuery.data)) {
      const existing = byId.get(mapped.id);
      if (existing) {
        // Üyelik rolü varsa koru; owner kaydı zaten OWNER
        if (mapped.role && existing.role === "OWNER" && mapped.role !== "OWNER") {
          byId.set(mapped.id, { ...existing, role: mapped.role });
        } else if (!existing.role && mapped.role) {
          byId.set(mapped.id, { ...existing, role: mapped.role });
        }
      } else {
        byId.set(mapped.id, mapped);
      }
    }

    const workspaces = Array.from(byId.values()).sort((a, b) => {
      const ta = a.created_at ? Date.parse(a.created_at) : 0;
      const tb = b.created_at ? Date.parse(b.created_at) : 0;
      return tb - ta;
    });

    console.log("[getWorkspaces] returning", {
      count: workspaces.length,
      ids: workspaces.map((w) => w.id),
    });

    return { success: true, workspaces };
  } catch (error) {
    console.error("[getWorkspaces] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

async function normalizeMemberRows(data: unknown): Promise<WorkspaceListItem[]> {
  if (!Array.isArray(data)) return [];

  const workspaces: WorkspaceListItem[] = [];
  for (const member of data) {
    if (!member || typeof member !== "object") continue;
    const row = member as {
      role?: string | null;
      workspaces?: Record<string, unknown> | Record<string, unknown>[] | null;
    };
    const wsRaw = Array.isArray(row.workspaces)
      ? row.workspaces[0]
      : row.workspaces;
    if (!wsRaw || typeof wsRaw !== "object") continue;
    const mapped = await mapWorkspaceRow(wsRaw, row.role ?? null);
    if (mapped) workspaces.push(mapped);
  }
  return workspaces;
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResult> {
  try {
    const name = input.name?.trim() ?? "";
    if (!name) {
      return { success: false, error: "Workspace adı zorunludur." };
    }

    const description = input.description?.trim() || null;
    const env = getSupabaseEnv();
    if (!env) {
      return {
        success: false,
        error:
          "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
      };
    }

    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const supabase = createUserScopedClient(env.url, env.anonKey, token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);

    if (userError || !user?.id) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const authUid = user.id;
    const payload = {
      name,
      description,
      owner_id: authUid,
    };

    if (payload.owner_id !== authUid) {
      return {
        success: false,
        error: "owner_id, auth.uid() ile eşleşmiyor.",
      };
    }

    console.info("[createWorkspace] insert payload", {
      name: payload.name,
      owner_id: payload.owner_id,
    });

    let { data: workspace, error: workspaceError } = await supabase
      .from("workspaces")
      .insert(payload)
      .select(WORKSPACE_SELECT)
      .single();

    if (
      workspaceError &&
      toPlainErrorMessage(workspaceError).includes("updated_at")
    ) {
      ({ data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert(payload)
        .select(WORKSPACE_SELECT_LEGACY)
        .single());
    }

    if (workspaceError || !workspace) {
      console.error("[createWorkspace] workspaces insert:", workspaceError);
      return {
        success: false,
        error: toPlainErrorMessage(
          workspaceError ?? "Workspace oluşturulamadı.",
        ),
      };
    }

    const newWorkspaceId = workspace.id as string;

    // Üyelik kaydı zorunlu (RLS: getWorkspaces + proje oluşturma)
    let memberRole = "OWNER";
    let { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: newWorkspaceId,
        user_id: authUid,
        role: memberRole,
      });

    // Şema Admin/Member/Guest kabul ediyorsa OWNER yerine Admin
    if (memberError) {
      const msg = toPlainErrorMessage(memberError).toLowerCase();
      const roleRejected =
        msg.includes("role") ||
        msg.includes("check") ||
        msg.includes("invalid") ||
        msg.includes("enum");

      if (roleRejected) {
        memberRole = "Admin";
        ({ error: memberError } = await supabase
          .from("workspace_members")
          .insert({
            workspace_id: newWorkspaceId,
            user_id: authUid,
            role: memberRole,
          }));
      }
    }

    if (memberError) {
      const msg = toPlainErrorMessage(memberError).toLowerCase();
      const alreadyMember =
        msg.includes("duplicate") ||
        msg.includes("unique") ||
        (typeof memberError === "object" &&
          memberError !== null &&
          "code" in memberError &&
          (memberError as { code?: string }).code === "23505");

      if (!alreadyMember) {
        console.error(
          "[createWorkspace] workspace_members insert:",
          memberError,
        );
        return { success: false, error: toPlainErrorMessage(memberError) };
      }
      // Trigger zaten Admin eklemiş olabilir
      memberRole = "Admin";
    }

    console.info("[createWorkspace] membership ensured", {
      workspace_id: newWorkspaceId,
      user_id: authUid,
      role: memberRole,
    });

    const mapped = await mapWorkspaceRow(
      workspace as Record<string, unknown>,
      memberRole,
    );
    if (!mapped) {
      return { success: false, error: "Geçersiz workspace yanıtı." };
    }

    return { success: true, workspace: mapped };
  } catch (error) {
    console.error("[createWorkspace] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
