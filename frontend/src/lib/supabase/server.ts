import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type {
  DashboardProject,
  DashboardTaskStats,
  ProjectTask,
  TaskPriority,
  TaskStatus,
} from "@/lib/supabase/types";

export type {
  DashboardProject,
  DashboardTaskStats,
  ProjectTask,
} from "@/lib/supabase/types";

const ACCESS_TOKEN_COOKIE = "sb_access_token";
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

function getSupabaseEnv(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.error(
      "[supabase] NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
    return null;
  }

  return { url, anonKey };
}

function createAuthedClient(accessToken?: string | null): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) {
    return null;
  }

  return createClient(env.url, env.anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Cookie'den access token oku ve kullanıcıyı doğrula.
 * @supabase/ssr cookie chunk'larına dokunmuyoruz (Internal Server Error kaynağı olabiliyor).
 */
export async function getAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
  accessToken: string;
} | null> {
  try {
    const cookieStore = await cookies();
    const accessToken =
      cookieStore.get(ACCESS_TOKEN_COOKIE)?.value?.trim() ||
      cookieStore.get("access_token")?.value?.trim() ||
      null;

    if (!accessToken) {
      return null;
    }

    const supabase = createAuthedClient(accessToken);
    if (!supabase) {
      return null;
    }

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (error || !user) {
      console.error(
        "[getAuthenticatedUser] getUser failed:",
        error?.message ?? "user null",
      );
      return null;
    }

    return { supabase, user, accessToken };
  } catch (error) {
    console.error("[getAuthenticatedUser] unexpected:", error);
    return null;
  }
}

/** Geriye dönük uyumluluk — SSR cookie client kullanmadan Bearer client döner. */
export async function createSupabaseServerClient(): Promise<SupabaseClient | null> {
  const auth = await getAuthenticatedUser();
  if (auth) {
    return auth.supabase;
  }
  return createAuthedClient();
}

function resolveUserName(user: User): string {
  const meta = user.user_metadata as
    | {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      }
    | undefined;

  const fullName = meta?.full_name?.trim();
  const combined = `${meta?.first_name ?? ""} ${meta?.last_name ?? ""}`.trim();
  return fullName || combined || user.email?.split("@")[0] || "Kullanıcı";
}

export async function getCurrentUserProjects(
  workspaceId?: string | null,
): Promise<{
  userName: string;
  projects: DashboardProject[];
}> {
  try {
    const auth = await getAuthenticatedUser();

    if (!auth) {
      return { userName: "Kullanıcı", projects: [] };
    }

    const { supabase, user } = auth;
    const userName = resolveUserName(user);
    const cookieStore = await cookies();
    const activeWorkspaceId =
      workspaceId?.trim() ||
      cookieStore.get("active_workspace_id")?.value?.trim() ||
      null;

    if (!activeWorkspaceId) {
      return { userName, projects: [] };
    }

    // Sahipsiz (workspace_id NULL) eski projeleri varsayılan/ilk workspace'e bağla
    try {
      const { data: memberships } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id)
        .limit(20);

      const memberIds = (memberships ?? [])
        .map((row) => row.workspace_id as string | undefined)
        .filter((id): id is string => Boolean(id));
      const defaultWorkspaceId = memberIds[0] ?? activeWorkspaceId;

      if (defaultWorkspaceId) {
        await supabase
          .from("projects")
          .update({ workspace_id: defaultWorkspaceId })
          .is("workspace_id", null)
          .or(`created_by.eq.${user.id},user_id.eq.${user.id}`);
      }
    } catch (backfillError) {
      console.warn("[getCurrentUserProjects] orphan backfill:", backfillError);
    }

    // SADECE aktif workspace_id ile filtrele (RLS ek erişim kontrolü sağlar)
    const selectCols =
      "id, name, description, created_at, updated_at, workspace_id, user_id, created_by";

    let { data, error } = await supabase
      .from("projects")
      .select(selectCols)
      .eq("workspace_id", activeWorkspaceId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error?.message?.includes("deleted_at")) {
      ({ data, error } = await supabase
        .from("projects")
        .select(selectCols)
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }));
    }

    if (error?.message?.includes("updated_at")) {
      ({ data, error } = await supabase
        .from("projects")
        .select(
          "id, name, description, created_at, workspace_id, user_id, created_by",
        )
        .eq("workspace_id", activeWorkspaceId)
        .order("created_at", { ascending: false }));
    }

    if (error) {
      console.error("[getCurrentUserProjects] query:", error.message);
      return { userName, projects: [] };
    }

    // Fallback: bu workspace'te kayıt yoksa, sahipsiz kalanları da göster
    let rows = data ?? [];
    if (rows.length === 0) {
      const orphans = await supabase
        .from("projects")
        .select(
          "id, name, description, created_at, updated_at, workspace_id, user_id, created_by",
        )
        .is("workspace_id", null)
        .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });

      if (!orphans.error && orphans.data?.length) {
        rows = orphans.data;
      }
    }

    return {
      userName,
      projects: rows.map((row) => ({
        id: row.id as string,
        name: (row.name as string) ?? "Adsız proje",
        description: (row.description as string | null) ?? null,
        created_at: (row.created_at as string | null) ?? null,
        updated_at:
          "updated_at" in row
            ? ((row.updated_at as string | null) ?? null)
            : null,
        workspace_id: (row.workspace_id as string | null) ?? null,
        user_id:
          "user_id" in row ? ((row.user_id as string | null) ?? null) : null,
        created_by:
          "created_by" in row
            ? ((row.created_by as string | null) ?? null)
            : null,
      })),
    };
  } catch (error) {
    console.error("[getCurrentUserProjects]", error);
    return { userName: "Kullanıcı", projects: [] };
  }
}

export async function getDashboardTaskStats(
  projectIds: string[],
): Promise<DashboardTaskStats> {
  const empty = { total: 0, inProgress: 0, done: 0 };
  try {
    if (!projectIds.length) {
      return empty;
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return empty;
    }

    let { data, error } = await auth.supabase
      .from("tasks")
      .select("id, status, project_id")
      .in("project_id", projectIds)
      .is("deleted_at", null);

    if (error?.message?.includes("deleted_at")) {
      ({ data, error } = await auth.supabase
        .from("tasks")
        .select("id, status, project_id")
        .in("project_id", projectIds));
    }

    if (error || !data) {
      console.error("[getDashboardTaskStats]", error?.message);
      return empty;
    }

    let inProgress = 0;
    let done = 0;
    for (const row of data) {
      if (row.status === "IN_PROGRESS") inProgress += 1;
      if (row.status === "DONE") done += 1;
    }

    return { total: data.length, inProgress, done };
  } catch (error) {
    console.error("[getDashboardTaskStats]", error);
    return empty;
  }
}

export async function getProjectById(
  projectId: string,
): Promise<DashboardProject | null> {
  try {
    if (!projectId?.trim()) {
      return null;
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return null;
    }

    const { supabase, user } = auth;

    // projects sahiplik sütunu: user_id (owner_id değil)
    let { data, error } = await supabase
      .from("projects")
      .select(
        "id, name, description, created_at, created_by, user_id, workspace_id",
      )
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (
      error?.message?.includes("user_id") ||
      error?.message?.includes("workspace_id") ||
      error?.message?.includes("deleted_at")
    ) {
      ({ data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, created_by, user_id, workspace_id")
        .eq("id", projectId)
        .maybeSingle());
    }

    if (error || !data) {
      return null;
    }

    const ownedByUser =
      ("user_id" in data && data.user_id === user.id) ||
      data.created_by === user.id;

    if (!ownedByUser) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at,
      workspace_id:
        "workspace_id" in data
          ? ((data.workspace_id as string | null) ?? null)
          : null,
    };
  } catch (error) {
    console.error("[getProjectById]", error);
    return null;
  }
}

function normalizeTaskStatus(value: unknown): TaskStatus {
  if (value === "IN_PROGRESS" || value === "DONE" || value === "TODO") {
    return value;
  }
  if (typeof value === "string") {
    const key = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
    if (key === "TODO" || key === "TO_DO") return "TODO";
    if (key === "IN_PROGRESS" || key === "INPROGRESS" || key === "DOING") {
      return "IN_PROGRESS";
    }
    if (key === "DONE" || key === "COMPLETED" || key === "COMPLETE") {
      return "DONE";
    }
  }
  return "TODO";
}

function normalizeTaskPriority(value: unknown): TaskPriority {
  if (value === "LOW" || value === "HIGH" || value === "MEDIUM") {
    return value;
  }
  return "MEDIUM";
}

export async function getProjectTasks(
  projectId: string,
  workspaceId?: string | null,
): Promise<ProjectTask[]> {
  try {
    if (!projectId?.trim()) {
      return [];
    }

    const auth = await getAuthenticatedUser();
    if (!auth) {
      return [];
    }

    const { supabase } = auth;
    const activeWorkspaceId = workspaceId?.trim() || null;

    let query = supabase
      .from("tasks")
      .select(
        "id, title, description, status, priority, project_id, workspace_id, due_date, parent_task_id, created_at, created_by",
      )
      .eq("project_id", projectId)
      .is("deleted_at", null)
      .is("parent_task_id", null)
      .order("created_at", { ascending: false });

    if (activeWorkspaceId) {
      query = query.eq("workspace_id", activeWorkspaceId);
    }

    const primary = await query;
    let rows: Record<string, unknown>[] | null =
      (primary.data as Record<string, unknown>[] | null) ?? null;
    let error = primary.error;

    if (
      error?.message?.includes("deleted_at") ||
      error?.message?.includes("parent_task_id") ||
      error?.message?.includes("due_date")
    ) {
      let fallback = supabase
        .from("tasks")
        .select(
          "id, title, description, status, priority, project_id, workspace_id, created_at, created_by",
        )
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (activeWorkspaceId) {
        fallback = fallback.eq("workspace_id", activeWorkspaceId);
      }

      const fallbackResult = await fallback;
      rows = (fallbackResult.data as Record<string, unknown>[] | null) ?? null;
      error = fallbackResult.error;
    }

    if (error) {
      console.error("[getProjectTasks]", error.message);
      return [];
    }

    const topLevel = (rows ?? []).filter((row) => {
      if (!("parent_task_id" in row)) return true;
      return row.parent_task_id == null;
    });

    const tasks: ProjectTask[] = topLevel.map((row) => ({
      id: row.id as string,
      title: (row.title as string) ?? "Adsız görev",
      description: (row.description as string | null) ?? null,
      status: normalizeTaskStatus(row.status),
      priority: normalizeTaskPriority(row.priority),
      project_id: (row.project_id as string | null) ?? null,
      workspace_id: (row.workspace_id as string | null) ?? null,
      due_date:
        "due_date" in row ? ((row.due_date as string | null) ?? null) : null,
      parent_task_id:
        "parent_task_id" in row
          ? ((row.parent_task_id as string | null) ?? null)
          : null,
      created_at: (row.created_at as string | null) ?? null,
      created_by: (row.created_by as string | null) ?? null,
      subtask_done: 0,
      subtask_total: 0,
    }));

    const parentIds = tasks.map((t) => t.id);
    if (parentIds.length === 0) return tasks;

    const { data: children, error: childError } = await supabase
      .from("tasks")
      .select("parent_task_id, status")
      .in("parent_task_id", parentIds)
      .is("deleted_at", null);

    if (childError?.message?.includes("deleted_at")) {
      const fallbackChildren = await supabase
        .from("tasks")
        .select("parent_task_id, status")
        .in("parent_task_id", parentIds);
      if (!fallbackChildren.error && fallbackChildren.data) {
        applySubtaskCounts(tasks, fallbackChildren.data);
      }
    } else if (!childError && children) {
      applySubtaskCounts(tasks, children);
    }

    return tasks;
  } catch (error) {
    console.error("[getProjectTasks]", error);
    return [];
  }
}

function applySubtaskCounts(
  tasks: ProjectTask[],
  children: { parent_task_id: unknown; status: unknown }[],
) {
  const totals = new Map<string, { done: number; total: number }>();
  for (const child of children) {
    const pid =
      typeof child.parent_task_id === "string" ? child.parent_task_id : null;
    if (!pid) continue;
    const entry = totals.get(pid) ?? { done: 0, total: 0 };
    entry.total += 1;
    if (normalizeTaskStatus(child.status) === "DONE") entry.done += 1;
    totals.set(pid, entry);
  }
  for (const task of tasks) {
    const entry = totals.get(task.id);
    if (entry) {
      task.subtask_done = entry.done;
      task.subtask_total = entry.total;
    }
  }
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };
