import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { persistAuthSession } from "@/lib/auth-session";

/** localStorage Nest JWT'lerini Supabase Auth oturumuna bağlar (MFA için gerekli). */
export async function ensureSupabaseAuthSession() {
  const supabase = createSupabaseBrowserClient();
  const accessToken =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;
  const refreshToken =
    typeof window !== "undefined"
      ? localStorage.getItem("refresh_token")
      : null;

  if (!accessToken?.trim()) {
    return { supabase, session: null as null };
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

  const { data } = await supabase.auth.getSession();
  return { supabase, session: data.session };
}

export async function persistSupabaseSessionToApp() {
  const supabase = createSupabaseBrowserClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  if (!session?.access_token) return null;
  await persistAuthSession(
    session.access_token,
    session.user,
    session.refresh_token,
  );
  return session;
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
  const { supabase } = await ensureSupabaseAuthSession();
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    console.warn("[mfa] AAL:", error.message);
    return false;
  }
  return data.currentLevel === "aal1" && data.nextLevel === "aal2";
}
