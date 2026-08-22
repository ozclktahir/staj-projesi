"use client";

import { useEffect } from "react";
import { scheduleAuthTokenRefresh } from "@/lib/auth-token-refresh";

/** Görünür UI'ı yok — yalnızca arka planda sessiz JWT yenileme döngüsünü çalıştırır. */
export function AuthTokenRefreshProvider() {
  useEffect(() => scheduleAuthTokenRefresh(), []);
  return null;
}
