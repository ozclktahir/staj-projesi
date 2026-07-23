"use client";

import { useCallback, useEffect, useState } from "react";
import { History, UserRound } from "lucide-react";
import {
  getProjectActivityLogs,
  type ActivityLogItem,
} from "@/app/actions/activity-logs";
import { formatActivityMessage } from "@/lib/activity-format";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
  createAuthedRealtimeClient,
} from "@/lib/supabase/client";
import { mapRealtimeActivityRow } from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";

type ProjectActivityPanelProps = {
  projectId: string;
  workspaceId?: string | null;
  className?: string;
};

export function ProjectActivityPanel({
  projectId,
  className,
}: ProjectActivityPanelProps) {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getProjectActivityLogs(projectId, 80);
    if (result.success) setLogs(result.logs);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: project activity_logs
  useEffect(() => {
    const client = createAuthedRealtimeClient();
    if (!client || !projectId) return;

    const channel = client
      .channel(`activity-logs:project:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activity_logs",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const row = payload.new as Record<string, unknown>;
          if (!row?.id) return;
          const item = mapRealtimeActivityRow(row);
          setLogs((prev) => {
            if (prev.some((l) => l.id === item.id)) return prev;
            return [item, ...prev].slice(0, 80);
          });
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [projectId]);

  return (
    <aside
      className={cn(
        "flex h-full max-h-full flex-col overflow-y-auto",
        className,
      )}
    >
      <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card/80 px-4 py-3 backdrop-blur">
        <History className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Aktivite</h2>
      </div>

      <div className="flex-1 p-3">
        {loading ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Yükleniyor…
          </p>
        ) : logs.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">
            Bu projede henüz aktivite yok.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {logs.map((log) => {
              const title =
                typeof log.details.task_title === "string"
                  ? log.details.task_title
                  : null;

              return (
                <li
                  key={log.id}
                  className="flex gap-2.5 rounded-md border border-border/80 bg-background px-2.5 py-2"
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
                    <p className="text-xs font-medium text-foreground">
                      {log.actorName}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatActivityMessage(log)}
                    </p>
                    {title && log.taskId ? (
                      <p className="mt-1 truncate text-[11px] text-primary">
                        Görev: {title}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[10px] text-muted-foreground/80">
                      {formatRelativeTime(log.createdAt)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}
