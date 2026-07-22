"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  formatAuthUserLabel,
  formatUserCompact,
  PROFILE_SELECT_FIELDS,
  PROFILE_SELECT_FIELDS_FALLBACK,
} from "@/lib/member-labels";

/**
 * Header / profil alanı için görünen ad.
 * profiles.full_name → metadata → e-posta → e-posta yerel kısmı.
 */
export async function getCurrentUserDisplayLabel(): Promise<{
  displayName: string;
  email: string | null;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      return { displayName: "Kullanıcı Yükleniyor...", email: null };
    }

    const { supabase, user } = auth;
    let profile: Record<string, unknown> | null = null;

    const { data, error } = await supabase
      .from("profiles")
      .select(PROFILE_SELECT_FIELDS)
      .eq("id", user.id)
      .maybeSingle();

    if (!error && data) {
      profile = data as Record<string, unknown>;
    } else {
      const { data: fallback } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FIELDS_FALLBACK)
        .eq("id", user.id)
        .maybeSingle();
      profile = (fallback as Record<string, unknown> | null) ?? null;
    }

    const meta = user.user_metadata as
      | {
          full_name?: string;
          display_name?: string;
          first_name?: string;
          last_name?: string;
        }
      | undefined;

    const merged: Record<string, unknown> = {
      ...(profile ?? {}),
      full_name:
        (typeof profile?.full_name === "string" && profile.full_name.trim()) ||
        meta?.full_name ||
        null,
      display_name:
        (typeof profile?.display_name === "string" &&
          profile.display_name.trim()) ||
        meta?.display_name ||
        null,
      first_name:
        (typeof profile?.first_name === "string" && profile.first_name.trim()) ||
        meta?.first_name ||
        null,
      last_name:
        (typeof profile?.last_name === "string" && profile.last_name.trim()) ||
        meta?.last_name ||
        null,
      email:
        (typeof profile?.email === "string" && profile.email.trim()) ||
        user.email ||
        null,
    };

    const displayName = formatUserCompact(merged, user.email);
    const fromAuth = formatAuthUserLabel({
      email: user.email,
      user_metadata: meta,
    });

    return {
      displayName: displayName || fromAuth || user.email?.split("@")[0] || user.email || "Kullanıcı Yükleniyor...",
      email: user.email ?? null,
    };
  } catch (error) {
    console.error("[getCurrentUserDisplayLabel]", error);
    return { displayName: "Kullanıcı Yükleniyor...", email: null };
  }
}
