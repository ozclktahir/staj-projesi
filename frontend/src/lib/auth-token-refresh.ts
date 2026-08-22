"use client";

import apiClient from "@/lib/api-client";
import {
  getAccessTokenExpiryMs,
  persistAuthSession,
  readAccessToken,
} from "@/lib/auth-session";

/**
 * `AuthTokenRefreshProvider` her başarılı yenilemeden sonra bu event'i
 * yayar — canlı Supabase Realtime aboneliklerinin (bkz.
 * invite-notifications-menu.tsx) eski token'la açılmış bağlantıyı yeni
 * token'la yeniden kurması için.
 */
export const AUTH_TOKEN_REFRESHED_EVENT = "sb-token-refreshed";

const REFRESH_MARGIN_MS = 2 * 60 * 1000; // süresi dolmadan 2 dk önce yenile
const MIN_DELAY_MS = 5_000;
const FALLBACK_DELAY_MS = 5 * 60 * 1000; // exp okunamazsa 5 dk'da bir dene

/**
 * Backend `/auth/refresh` ile access_token'ı yeniler ve oturumu günceller.
 * Bu uç zaten vardı ve mobil (Dio interceptor) kullanıyordu — web hiç
 * çağırmıyordu. Bunun sonucu: web sekmesi ~1 saatlik Supabase JWT
 * süresinden uzun açık kaldığında Realtime bildirim aboneliği sessizce
 * doğrulanamaz hâle geliyordu (kullanıcı "bildirimler güncellenmiyor"
 * diye bildirdi — kök neden buydu).
 */
export async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let refreshToken: string | null = null;
  try {
    refreshToken = localStorage.getItem("refresh_token");
  } catch {
    refreshToken = null;
  }
  if (!refreshToken) return false;

  try {
    const { data } = await apiClient.post<{
      access_token?: string;
      refresh_token?: string;
      user?: unknown;
    }>("/auth/refresh", { refresh_token: refreshToken });

    if (!data.access_token) return false;

    await persistAuthSession(
      data.access_token,
      data.user,
      data.refresh_token ?? refreshToken,
    );
    window.dispatchEvent(new Event(AUTH_TOKEN_REFRESHED_EVENT));
    return true;
  } catch (error) {
    console.warn("[refreshAccessToken]", error);
    return false;
  }
}

/**
 * Kendi kendini zamanlayan yenileme döngüsü. Bir dashboard shell
 * provider'ından mount'ta bir kez çağrılır. Sekme arka plandayken
 * `setTimeout` güvenilmez olabileceğinden (tarayıcı throttle/uyku), sekme
 * tekrar görünür olduğunda da süresi yaklaşan/dolmuş token kontrol edilir.
 */
export function scheduleAuthTokenRefresh(): () => void {
  if (typeof window === "undefined") return () => {};

  let timer: ReturnType<typeof setTimeout> | null = null;
  let cancelled = false;

  function scheduleNext() {
    if (timer) clearTimeout(timer);
    const token = readAccessToken();
    const expiryMs = token ? getAccessTokenExpiryMs(token) : null;
    const delay =
      expiryMs != null
        ? Math.max(expiryMs - Date.now() - REFRESH_MARGIN_MS, MIN_DELAY_MS)
        : FALLBACK_DELAY_MS;
    timer = setTimeout(() => void runAndReschedule(), delay);
  }

  async function runAndReschedule() {
    if (cancelled) return;
    await refreshAccessToken();
    if (!cancelled) scheduleNext();
  }

  function onVisible() {
    if (document.visibilityState !== "visible") return;
    const token = readAccessToken();
    const expiryMs = token ? getAccessTokenExpiryMs(token) : null;
    if (expiryMs == null || expiryMs - Date.now() < REFRESH_MARGIN_MS) {
      void runAndReschedule();
    }
  }

  document.addEventListener("visibilitychange", onVisible);
  scheduleNext();

  return () => {
    cancelled = true;
    if (timer) clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
