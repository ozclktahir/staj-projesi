"use server";

import { getAuthenticatedUser } from "@/lib/supabase/server";
import {
  cleanText,
  emailLocalPart,
  formatPersonName,
  loadProfilesByIds,
} from "@/lib/member-labels";

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

    let profile =
      (await loadProfilesByIds(supabase, [user.id])).get(user.id) ?? null;
    let displayName = formatPersonName(profile, user.email);

    if (!displayName) {
      const metaFull =
        cleanText(meta?.full_name) ||
        `${cleanText(meta?.first_name) ?? ""} ${cleanText(meta?.last_name) ?? ""}`.trim() ||
        null;
      const nextFull = metaFull || emailLocalPart(user.email);

      if (nextFull || user.email) {
        const withNames = {
          id: user.id,
          email: user.email ?? null,
          full_name: nextFull,
          first_name: cleanText(meta?.first_name),
          last_name: cleanText(meta?.last_name),
        };
        const baseOnly = {
          id: user.id,
          email: user.email ?? null,
          full_name: nextFull,
        };

        console.info(
          "[getCurrentUserDisplayLabel] profiles upsert from metadata",
          withNames,
        );

        let { error: upsertError } = await supabase
          .from("profiles")
          .upsert(withNames);
        if (upsertError) {
          ({ error: upsertError } = await supabase
            .from("profiles")
            .upsert(baseOnly));
        }
        if (upsertError) {
          console.error(
            "[getCurrentUserDisplayLabel] upsert:",
            upsertError.message,
          );
        } else {
          profile =
            (await loadProfilesByIds(supabase, [user.id])).get(user.id) ??
            null;
          displayName = formatPersonName(profile, user.email);
        }
      }
    }

    if (!displayName) {
      displayName =
        cleanText(meta?.full_name) ||
        `${cleanText(meta?.first_name) ?? ""} ${cleanText(meta?.last_name) ?? ""}`.trim() ||
        emailLocalPart(user.email) ||
        cleanText(user.email) ||
        "";
    }

    console.info("[getCurrentUserDisplayLabel] sonuç", {
      userId: user.id,
      displayName,
      hasProfile: Boolean(profile),
    });

    return {
      displayName,
      email: user.email ?? cleanText(profile?.email) ?? null,
      firstName: cleanText(profile?.first_name) ?? cleanText(meta?.first_name),
      lastName: cleanText(profile?.last_name) ?? cleanText(meta?.last_name),
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
