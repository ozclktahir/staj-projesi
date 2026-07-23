"use client";

import { useCallback, useEffect, useState } from "react";
import { History, UserRound } from "lucide-react";
import {
  getProjectActivityLogs,
  type ActivityLogItem,
} from "@/app/actions/activity-logs";
import { formatActivityMessage } from "@/lib/activity-format";
import { formatRelativeTime } from "@/lib/format-relative-time";
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

  return (
    <aside
      className={cn(
        "flex max-h-[70vh] flex-col rounded-lg border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <History className="size-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Aktivite</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
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
