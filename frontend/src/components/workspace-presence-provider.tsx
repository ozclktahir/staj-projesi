"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { resolveRealtimeUserId } from "@/lib/supabase/realtime";

export type WorkspacePresenceState = {
  onlineUserIds: string[];
  onlineCount: number;
  /** Presence kanalı henüz senkronlaşmadıysa false (fallback değer gösterilmeli). */
  ready: boolean;
};

const EMPTY_PRESENCE: WorkspacePresenceState = {
  onlineUserIds: [],
  onlineCount: 0,
  ready: false,
};

const WorkspacePresenceContext =
  createContext<WorkspacePresenceState>(EMPTY_PRESENCE);

/**
 * Uygulama genelinde tek bir Supabase Realtime Presence kanalı tutar.
 *
 * Önceden presence yalnızca dashboard'daki `AnalyticsDashboard` mount olduğunda
 * abone oluyordu; kullanıcı /projects veya /personal'a geçtiğinde kanal
 * kapanıyor ve o kişi diğer herkesin "Aktif Üyeler" sayısından düşüyordu. Bu
 * sağlayıcı dashboard shell'ine (tüm korumalı sayfaların ortak layout'u)
 * takıldığı için oturum boyunca kullanıcı hangi sayfada olursa olsun çevrimiçi
 * görünür.
 */
export function WorkspacePresenceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { activeWorkspaceId } = useWorkspaces();
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setOnlineUserIds([]);
    setReady(false);

    if (!activeWorkspaceId) return;

    const client = createAuthedRealtimeClient();
    if (!client) return;

    let cancelled = false;
    let channel: ReturnType<typeof client.channel> | null = null;

    void (async () => {
      const userId = await resolveRealtimeUserId(client);
      if (!userId || cancelled) return;

      channel = client.channel(`presence:workspace:${activeWorkspaceId}`, {
        config: { presence: { key: userId } },
      });

      channel.on("presence", { event: "sync" }, () => {
        if (!channel || cancelled) return;
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
  }, [activeWorkspaceId]);

  const value = useMemo(
    (): WorkspacePresenceState => ({
      onlineUserIds,
      onlineCount: onlineUserIds.length,
      ready,
    }),
    [onlineUserIds, ready],
  );

  return (
    <WorkspacePresenceContext.Provider value={value}>
      {children}
    </WorkspacePresenceContext.Provider>
  );
}

/** Uygulama genelindeki presence durumunu okur (sağlayıcı yoksa boş değer). */
export function useWorkspacePresenceContext(): WorkspacePresenceState {
  return useContext(WorkspacePresenceContext);
}
