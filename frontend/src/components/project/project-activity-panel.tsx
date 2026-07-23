"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { History, UserRound } from "lucide-react";
import {
  getProjectActivityLogs,
  type ActivityLogItem,
} from "@/app/actions/activity-logs";
import { formatActivityMessage } from "@/lib/activity-format";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import { mapRealtimeActivityRow } from "@/lib/supabase/realtime";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type ProjectActivityDrawerProps = {
  projectId: string;
  workspaceId?: string | null;
};

function ActivityFeedList({
  logs,
  loading,
}: {
  logs: ActivityLogItem[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
        Yükleniyor…
      </p>
    );
  }

  if (logs.length === 0) {
    return (
      <p className="px-1 py-6 text-center text-xs text-muted-foreground">
        Bu projede henüz aktivite yok.
      </p>
    );
  }

  return (
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
  );
}

/**
 * Toolbar butonu + sağdan açılan aktivite çekmecesi.
 * Realtime aboneliği drawer kapalıyken de canlı kalır.
 */
export function ProjectActivityDrawer({
  projectId,
}: ProjectActivityDrawerProps) {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const openRef = useRef(open);

  useEffect(() => {
    openRef.current = open;
    if (open) setHasUnread(false);
  }, [open]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const result = await getProjectActivityLogs(projectId, 80);
    if (result.success) setLogs(result.logs);
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Realtime: kapalı/açık fark etmez — abonelik sürer
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
          if (!openRef.current) {
            setHasUnread(true);
          }
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [projectId]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="relative rounded-lg border-border"
      >
        <History className="size-4" />
        Aktivite
        {hasUnread ? (
          <span
            aria-label="Yeni aktivite"
            className="absolute -top-1 -right-1 size-2.5 rounded-full bg-orange-500 ring-2 ring-card"
          />
        ) : null}
      </Button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className={cn(
            "w-full gap-0 p-0 sm:max-w-md",
            "flex flex-col overflow-hidden",
          )}
        >
          <SheetHeader className="shrink-0 space-y-1 border-b border-border px-4 py-4 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <History className="size-4 text-primary" />
              Proje Aktivite Geçmişi
            </SheetTitle>
            <SheetDescription>
              Bu projedeki kullanıcı hareketleri kronolojik sırayla listelenir.
            </SheetDescription>
          </SheetHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ActivityFeedList logs={logs} loading={loading} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/** Geriye dönük alias */
export const ProjectActivityPanel = ProjectActivityDrawer;
