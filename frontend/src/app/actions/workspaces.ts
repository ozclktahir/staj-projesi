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
export function mapWorkspaceRow(
  row: Record<string, unknown>,
  role?: string | null,
): WorkspaceListItem | null {
  // Nest bazen { data: {...} } sarmalayabilir — aç
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

    const { data, error } = await supabase
      .from("workspace_members")
      .select(
        "role, workspaces(id, name, description, owner_id, created_at, updated_at)",
      )
      .eq("user_id", user.id);

    if (error) {
      // updated_at henüz yoksa eski select ile dene
      if (toPlainErrorMessage(error).includes("updated_at")) {
        const fallback = await supabase
          .from("workspace_members")
          .select(
            "role, workspaces(id, name, description, owner_id, created_at)",
          )
          .eq("user_id", user.id);

        if (fallback.error) {
          return {
            success: false,
            error: toPlainErrorMessage(fallback.error),
          };
        }

        const workspaces = normalizeMemberRows(fallback.data);
        return { success: true, workspaces };
      }

      console.error("[getWorkspaces]", error);
      return { success: false, error: toPlainErrorMessage(error) };
    }

    return { success: true, workspaces: normalizeMemberRows(data) };
  } catch (error) {
    console.error("[getWorkspaces] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

function normalizeMemberRows(data: unknown): WorkspaceListItem[] {
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
    const mapped = mapWorkspaceRow(wsRaw, row.role ?? null);
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
      .select("id, name, description, owner_id, created_at, updated_at")
      .single();

    if (
      workspaceError &&
      toPlainErrorMessage(workspaceError).includes("updated_at")
    ) {
      ({ data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .insert(payload)
        .select("id, name, description, owner_id, created_at")
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

    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id as string,
        user_id: authUid,
        role: "Admin",
      });

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
    }

    const mapped = mapWorkspaceRow(
      workspace as Record<string, unknown>,
      "Admin",
    );
    if (!mapped) {
      return { success: false, error: "Geçersiz workspace yanıtı." };
    }

    // Düz JSON — frontend state'i doğrudan tetikleyebilir
    return { success: true, workspace: mapped };
  } catch (error) {
    console.error("[createWorkspace] catch:", toPlainErrorMessage(error));
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
