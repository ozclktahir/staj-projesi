import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function getBrowserSupabaseEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL veya NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.",
    );
  }

  return { url, anonKey };
}

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getBrowserSupabaseEnv();
  return createBrowserClient(url, anonKey);
}

/**
 * Cookie yazmayan istemci — login/MFA sırasında @supabase/ssr cookie şişmesi
 * yüzünden sb_access_token kaybolmasın (redirect loop önlemi).
 */
export function createEphemeralSupabaseClient(): SupabaseClient {
  const { url, anonKey } = getBrowserSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    },
  });
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
