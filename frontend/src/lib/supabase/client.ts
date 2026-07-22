import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
  }

  return createBrowserClient(url, anonKey);
}

/**
 * Custom cookie/localStorage JWT ile Realtime dinlemek için.
 * SSR cookie chunk'larına dokunmaz.
 */
export function createAuthedRealtimeClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || typeof window === "undefined") return null;

  let accessToken: string | null = null;
  try {
    accessToken = localStorage.getItem("access_token");
  } catch {
    accessToken = null;
  }

  if (!accessToken?.trim()) return null;

  const client = createClient(url, anonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    realtime: {
      params: { apikey: anonKey },
    },
  });

  client.realtime.setAuth(accessToken);
  return client;
}
