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

function readCookieValue(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  name: string,
): string | null {
  try {
    const raw = cookieStore.get(name)?.value;
    if (!raw || raw.trim() === "") {
      return null;
    }
    // Next.js cookie değerlerini zaten decode eder; çift decode bozabilir
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  } catch {
    return null;
  }
}

/**
 * Cookie tabanlı Supabase sunucu istemcisi (@supabase/ssr).
 * RLS için auth.uid() bu client üzerinden çalışır.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component içinde set başarısız olabilir; yok say
        }
      },
    },
  });
}

/**
 * Manuel JWT cookie'lerinden (sb_access_token) fallback istemci.
 * Eski oturumlar / Nest login sonrası geçiş için.
 */
export async function createSupabaseServerClientFromAccessToken(): Promise<{
  supabase: SupabaseClient;
  accessToken: string | null;
  refreshToken: string | null;
}> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();
  const accessToken = readCookieValue(cookieStore, ACCESS_TOKEN_COOKIE);
  const refreshToken = readCookieValue(cookieStore, REFRESH_TOKEN_COOKIE);

  const supabase = createClient(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }

  return { supabase, accessToken, refreshToken };
}

export async function getAuthenticatedUser(): Promise<{
  supabase: SupabaseClient;
  user: User;
} | null> {
  // 1) @supabase/ssr cookie session
  const ssrClient = await createSupabaseServerClient();
  const {
    data: { user: ssrUser },
    error: ssrError,
  } = await ssrClient.auth.getUser();

  if (!ssrError && ssrUser) {
    return { supabase: ssrClient, user: ssrUser };
  }

  // 2) Fallback: Nest login JWT cookie
  const {
    supabase: tokenClient,
    accessToken,
  } = await createSupabaseServerClientFromAccessToken();

  if (!accessToken) {
    return null;
  }

  const {
    data: { user },
    error,
  } = await tokenClient.auth.getUser(accessToken);

  if (error || !user) {
    return null;
  }

  return { supabase: tokenClient, user };
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
