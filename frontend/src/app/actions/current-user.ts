"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  PROFILE_SELECT_FIELDS,
  PROFILE_SELECT_FIELDS_FALLBACK,
} from "@/lib/member-labels";

function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t || null;
}

/** profiles satırından Ad Soyad üretir. */
function nameFromProfile(
  profile: Record<string, unknown> | null,
): string | null {
  if (!profile) return null;
  const full = clean(profile.full_name);
  if (full) return full;
  const first = clean(profile.first_name) ?? "";
  const last = clean(profile.last_name) ?? "";
  const combined = `${first} ${last}`.trim();
  return combined || null;
}

/**
 * Header için: profiles tablosundan gerçek ad-soyad.
 * Yoksa auth metadata'dan profiles'a yazar ve tekrar okur.
 */
export async function getCurrentUserDisplayLabel(): Promise<{
  displayName: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
}> {
  try {
    const auth = await getAuthenticatedUser();
    if (!auth) {
      console.warn("[getCurrentUserDisplayLabel] oturum yok");
      return {
        displayName: "",
        email: null,
        firstName: null,
        lastName: null,
      };
    }

    const { supabase, user } = auth;
    const meta = user.user_metadata as
      | {
          full_name?: string;
          first_name?: string;
          last_name?: string;
        }
      | undefined;

    async function fetchProfile(): Promise<Record<string, unknown> | null> {
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FIELDS)
        .eq("id", user.id)
        .maybeSingle();

      if (!error && data) return data as Record<string, unknown>;

      if (error) {
        console.warn(
          "[getCurrentUserDisplayLabel] profile select:",
          error.message,
        );
      }

      const { data: fallback } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT_FIELDS_FALLBACK)
        .eq("id", user.id)
        .maybeSingle();

      return (fallback as Record<string, unknown> | null) ?? null;
    }

    let profile = await fetchProfile();
    let displayName = nameFromProfile(profile);

    // DB boşsa metadata'dan profiles'a yaz (kayıt sırasında yazılmamışsa)
    if (!displayName) {
      const metaFull =
        clean(meta?.full_name) ||
        `${clean(meta?.first_name) ?? ""} ${clean(meta?.last_name) ?? ""}`.trim();

      if (metaFull || user.email) {
        const payload = {
          id: user.id,
          email: user.email ?? null,
          full_name: metaFull || null,
          first_name: clean(meta?.first_name),
          last_name: clean(meta?.last_name),
        };
        console.info(
          "[getCurrentUserDisplayLabel] profiles upsert from metadata",
          payload,
        );
        const { error: upsertError } = await supabase
          .from("profiles")
          .upsert(payload);
        if (upsertError) {
          console.error(
            "[getCurrentUserDisplayLabel] upsert:",
            upsertError.message,
          );
        } else {
          profile = await fetchProfile();
          displayName = nameFromProfile(profile);
        }
      }
    }

    // Hâlâ yoksa metadata'yı doğrudan göster (UI boş kalmasın)
    if (!displayName) {
      displayName =
        clean(meta?.full_name) ||
        `${clean(meta?.first_name) ?? ""} ${clean(meta?.last_name) ?? ""}`.trim() ||
        "";
    }

    console.info("[getCurrentUserDisplayLabel] sonuç", {
      userId: user.id,
      displayName,
      profile,
    });

    return {
      displayName,
      email: user.email ?? clean(profile?.email) ?? null,
      firstName: clean(profile?.first_name) ?? clean(meta?.first_name),
      lastName: clean(profile?.last_name) ?? clean(meta?.last_name),
    };
  } catch (error) {
    console.error("[getCurrentUserDisplayLabel]", error);
    return {
      displayName: "",
      email: null,
      firstName: null,
      lastName: null,
    };
  }
}
