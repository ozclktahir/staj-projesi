"use client";

import { useEffect, useState } from "react";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { resolveRealtimeUserId } from "@/lib/supabase/realtime";

type PresenceState = {
  onlineUserIds: string[];
  onlineCount: number;
  /** Presence kanalı henüz senkronlaşmadıysa false (fallback değer gösterilmeli). */
  ready: boolean;
};

/**
 * Supabase Realtime Presence ile bir workspace'teki "şu an çevrimiçi"
 * kullanıcıları canlı takip eder (channel.track + presenceState).
 * Sekme kapanınca / kanal koparınca kullanıcı otomatik "leave" olur.
 */
export function useWorkspacePresence(
  workspaceId: string | null | undefined,
): PresenceState {
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOnlineUserIds([]);
    setReady(false);

    if (!workspaceId) return;

    const client = createAuthedRealtimeClient();
    if (!client) return;

    let cancelled = false;
    let channel: ReturnType<typeof client.channel> | null = null;

    void (async () => {
      const userId = await resolveRealtimeUserId(client);
      if (!userId || cancelled) return;

      channel = client.channel(`presence:workspace:${workspaceId}`, {
        config: { presence: { key: userId } },
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!channel) return;
        setOnlineUserIds(Object.keys(channel.presenceState()));
        setReady(true);
      });

      channel.subscribe((status) => {
        if (status === "SUBSCRIBED" && channel && !cancelled) {
          void channel.track({ online_at: new Date().toISOString() });
        }
      });
    })();

    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [workspaceId]);

  return { onlineUserIds, onlineCount: onlineUserIds.length, ready };
}
