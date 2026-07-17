import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { DashboardProject } from "@/lib/supabase/types";

export type { DashboardProject } from "@/lib/supabase/types";

const ACCESS_TOKEN_COOKIE = "sb_access_token";
const REFRESH_TOKEN_COOKIE = "sb_refresh_token";

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
  }

  return { url, anonKey };
}

/**
 * Cookie tabanlı Supabase sunucu istemcisi.
 * get/set + getAll/setAll birlikte map'lenir.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      get: (name: string) => cookieStore.get(name)?.value,
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // ignore
        }
      },
      remove: (name: string, options?: Record<string, unknown>) => {
        try {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        } catch {
          // ignore
        }
      },
    },
  });
}
export async function getAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
} | null> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value ?? null;
  const refreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value ?? null;

  const supabase = await createSupabaseServerClient();

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.error("[getAuthenticatedUser] setSession:", error.message);
    }
  }

  const {
    data: { user: sessionUser },
    error: sessionError,
  } = await supabase.auth.getUser();

  if (!sessionError && sessionUser) {
    return { supabase, user: sessionUser };
  }

  if (accessToken) {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(accessToken);

    if (!error && user) {
      // RLS insert'leri için Authorization header'lı client
      const { url, anonKey } = getSupabaseEnv();
      const authed = createClient(url, anonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
      return { supabase: authed, user };
    }

    console.error(
      "[getAuthenticatedUser] getUser(jwt) failed:",
      error?.message ?? "user null",
    );
  } else {
    console.error("[getAuthenticatedUser] No sb_access_token cookie");
  }

  if (sessionError) {
    console.error("[getAuthenticatedUser] getUser():", sessionError.message);
  }

  return null;
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
}

export async function getProjectById(
  projectId: string,
): Promise<DashboardProject | null> {
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
}
