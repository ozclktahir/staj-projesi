import type { Session } from "@supabase/supabase-js";
import { createEphemeralSupabaseClient } from "@/lib/supabase/client";
import { persistAuthSession } from "@/lib/auth-session";

/** localStorage Nest JWT'lerini bellek içi Supabase oturumuna bağlar (cookie yazmaz). */
export async function ensureSupabaseAuthSession() {
  const supabase = createEphemeralSupabaseClient();
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null;

  if (!accessToken?.trim()) {
    return { supabase, session: null as Session | null };
  }

  if (refreshToken?.trim()) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (error) {
      console.warn("[mfa] setSession:", error.message);
    }
    return { supabase, session: data.session };
  }

  // Refresh yoksa setSession yapılamaz; MFA için Nest'in refresh_token dönmesi gerekir.
  await supabase.auth.getUser(accessToken);
  return { supabase, session: null as Session | null };
}

export async function persistSupabaseSessionToApp(session?: Session | null) {
  const active = session ?? (await ensureSupabaseAuthSession()).session;
  if (!active?.access_token) return null;
  await persistAuthSession(
    active.access_token,
    active.user,
    active.refresh_token,
  );
  return active;
}

export type MfaFactorSummary = {
  id: string;
  friendlyName: string | null;
  status: string;
  factorType: string;
};

export async function listTotpFactors(): Promise<MfaFactorSummary[]> {
  const { supabase } = await ensureSupabaseAuthSession();
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw new Error(error.message);
  return (data.totp ?? []).map((f) => ({
    id: f.id,
    friendlyName: f.friendly_name ?? null,
    status: f.status,
    factorType: f.factor_type,
  }));
}

export async function needsMfaChallenge(): Promise<boolean> {
  const { supabase, session } = await ensureSupabaseAuthSession();
  if (!session) return false;
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    console.warn("[mfa] AAL:", error.message);
    return false;
  }
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}
