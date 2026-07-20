"use server";

import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE } from "@/lib/auth-session";

export type WorkspaceListItem = {
  id: string;
  name: string;
  description?: string | null;
  role?: string | null;
  created_at?: string | null;
};

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

function getApiBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

function toPlainErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "string" && error.trim()) {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "Beklenmeyen bir hata oluştu.";
  }
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
    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const response = await fetch(`${getApiBaseUrl()}/workspace`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      return {
        success: false,
        error: body || `Workspace listesi alınamadı (${response.status}).`,
      };
    }

    const data = (await response.json()) as unknown;
    const list = Array.isArray(data) ? data : [];

    const workspaces: WorkspaceListItem[] = list
      .map((item) => {
        if (!item || typeof item !== "object") return null;
        const row = item as Record<string, unknown>;
        if (typeof row.id !== "string" || typeof row.name !== "string") {
          return null;
        }
        return {
          id: row.id,
          name: row.name,
          description:
            typeof row.description === "string" ? row.description : null,
          role: typeof row.role === "string" ? row.role : null,
          created_at:
            typeof row.created_at === "string" ? row.created_at : null,
        };
      })
      .filter((item): item is WorkspaceListItem => item !== null);

    return { success: true, workspaces };
  } catch (error) {
    return { success: false, error: toPlainErrorMessage(error) };
  }
}

export async function createWorkspace(
  input: CreateWorkspaceInput,
): Promise<CreateWorkspaceResult> {
  try {
    const name = input.name?.trim() ?? "";
    if (!name) {
      return { success: false, error: "Workspace adı zorunludur." };
    }

    const token = await getAccessToken();
    if (!token) {
      return {
        success: false,
        error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın.",
      };
    }

    const response = await fetch(`${getApiBaseUrl()}/workspace`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description: input.description?.trim() || undefined,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      let message = `Workspace oluşturulamadı (${response.status}).`;
      try {
        const body = (await response.json()) as { message?: string | string[] };
        if (typeof body.message === "string") {
          message = body.message;
        } else if (Array.isArray(body.message)) {
          message = body.message.join(", ");
        }
      } catch {
        // ignore parse errors
      }
      return { success: false, error: message };
    }

    const data = (await response.json()) as Record<string, unknown>;
    if (typeof data.id !== "string" || typeof data.name !== "string") {
      return { success: false, error: "Geçersiz workspace yanıtı." };
    }

    return {
      success: true,
      workspace: {
        id: data.id,
        name: data.name,
        description:
          typeof data.description === "string" ? data.description : null,
        created_at:
          typeof data.created_at === "string" ? data.created_at : null,
      },
    };
  } catch (error) {
    return { success: false, error: toPlainErrorMessage(error) };
  }
}
