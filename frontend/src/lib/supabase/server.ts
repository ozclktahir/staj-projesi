import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { DashboardProject } from "@/lib/supabase/types";

export type { DashboardProject } from "@/lib/supabase/types";

const ACCESS_TOKEN_COOKIE = "sb_access_token";

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

export async function createSupabaseServerClient(): Promise<{
  supabase: SupabaseClient;
  accessToken: string | null;
}> {
  const { url, anonKey } = getSupabaseEnv();
  const cookieStore = await cookies();

  let accessToken: string | null = null;
  try {
    const raw = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
    accessToken = raw && raw.trim() !== "" ? decodeURIComponent(raw) : null;
  } catch {
    accessToken = null;
  }

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

  return { supabase, accessToken };
}

export async function getCurrentUserProjects(): Promise<{
  userName: string;
  projects: DashboardProject[];
}> {
  const { supabase, accessToken } = await createSupabaseServerClient();

  if (!accessToken) {
    return { userName: "Kullanıcı", projects: [] };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser(accessToken);

  if (userError || !user) {
    return { userName: "Kullanıcı", projects: [] };
  }

  const meta = user.user_metadata as
    | {
        first_name?: string;
        last_name?: string;
        full_name?: string;
      }
    | undefined;

  const fullName = meta?.full_name?.trim();
  const combined = `${meta?.first_name ?? ""} ${meta?.last_name ?? ""}`.trim();
  const userName =
    fullName ||
    combined ||
    user.email?.split("@")[0] ||
    "Kullanıcı";

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
