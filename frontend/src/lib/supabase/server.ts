import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { DashboardProject } from "@/lib/supabase/types";

export type { DashboardProject } from "@/lib/supabase/types";

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

export async function getCurrentUserProjects(): Promise<{
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

    const { data, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at")
      .or(`created_by.eq.${user.id},user_id.eq.${user.id}`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getCurrentUserProjects] query:", error.message);
      const fallback = await supabase
        .from("projects")
        .select("id, name, description, created_at")
        .eq("created_by", user.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      return {
        userName,
        projects: (fallback.data as DashboardProject[] | null) ?? [],
      };
    }

    return {
      userName,
      projects: (data as DashboardProject[] | null) ?? [],
    };
  } catch (error) {
    console.error("[getCurrentUserProjects]", error);
    return { userName: "Kullanıcı", projects: [] };
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

    let { data, error } = await supabase
      .from("projects")
      .select("id, name, description, created_at, created_by, user_id")
      .eq("id", projectId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error?.message?.includes("user_id")) {
      ({ data, error } = await supabase
        .from("projects")
        .select("id, name, description, created_at, created_by")
        .eq("id", projectId)
        .is("deleted_at", null)
        .maybeSingle());
    }

    if (error || !data) {
      return null;
    }

    const ownedByUser =
      data.created_by === user.id ||
      ("user_id" in data && data.user_id === user.id);

    if (!ownedByUser) {
      return null;
    }

    return {
      id: data.id,
      name: data.name,
      description: data.description,
      created_at: data.created_at,
    };
  } catch (error) {
    console.error("[getProjectById]", error);
    return null;
  }
}

export { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE };
