"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";

/**
 * Dashboard grafiklerini canlı tutar.
 *
 * Analitik veri sunucuda (RSC) hesaplanıyor ve grafiklere prop olarak
 * geçiyordu; sayfa açıkken görev eklendiğinde/durumu değiştiğinde hiçbir şey
 * `router.refresh()` çağırmadığı için grafikler eski değerlerde kalıyordu.
 * Burada workspace'in `tasks` ve `projects` tablolarını dinleyip değişiklikleri
 * kısa bir gecikmeyle (burst'leri tek yenilemede toplamak için) sunucuya geri
 * soruyoruz.
 */
export function AnalyticsLiveRefresh({
  workspaceId,
}: {
  workspaceId: string | null;
}) {
  const router = useRouter();
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const client = createAuthedRealtimeClient();
    if (!client) return;

    const scheduleRefresh = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        router.refresh();
      }, 400);
    };

    const channel = client
      .channel(`analytics:${workspaceId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "projects",
          filter: `workspace_id=eq.${workspaceId}`,
        },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      void client.removeChannel(channel);
    };
  }, [workspaceId, router]);

  return null;
}
