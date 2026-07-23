"use client";

import { useCallback, useEffect, useState } from "react";
import { History, UserRound } from "lucide-react";
import {
  getTaskActivityLogs,
  type ActivityLogItem,
} from "@/app/actions/activity-logs";
import { formatActivityMessage } from "@/lib/activity-format";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { mapRealtimeActivityRow } from "@/lib/supabase/realtime";

type TaskActivityFeedProps = {
  taskId: string;
  refreshKey?: number;
};

export function TaskActivityFeed({ taskId, refreshKey = 0 }: TaskActivityFeedProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getTaskActivityLogs(taskId, 40);
    if (result.success) setLogs(result.logs);
    setLoading(false);
  }, [taskId]);

  useEffect(() => {
    void refresh();
  }, [refresh, refreshKey]);

  useEffect(() => {
    const client = createAuthedRealtimeClient();
    if (!client || !taskId) return;

    const channel = client
      .channel(`activity-logs:task:${taskId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `task_id=eq.${taskId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const item = mapRealtimeActivityRow(row);
          setLogs((prev) => {
            if (prev.some((l) => l.id === item.id)) return prev;
            return [item, ...prev].slice(0, 40);
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [taskId]);

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-foreground">
        <History className="size-4 text-primary" />
        <h3 className="text-sm font-semibold">Aktivite Geçmişi</h3>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">Yükleniyor…</p>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground">
          Bu görev için henüz aktivite yok.
        </div>
      ) : (
        <ul className="space-y-2">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex gap-2.5 rounded-lg border border-border bg-card px-3 py-2"
            >
              {log.actorAvatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={log.actorAvatarUrl}
                  alt={log.actorName}
                  className="mt-0.5 size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                />
              ) : (
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <UserRound className="size-3.5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground">
                  {formatActivityMessage(log)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {formatRelativeTime(log.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
