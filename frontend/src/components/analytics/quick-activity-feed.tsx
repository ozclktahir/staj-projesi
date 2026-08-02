"use client";

import { History, UserRound } from "lucide-react";
import type { ActivityLogItem } from "@/app/actions/activity-logs";
import { formatActivityMessage } from "@/lib/activity-format";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";

export function QuickActivityFeed({ logs }: { logs: ActivityLogItem[] }) {
  const { t, locale } = useTranslation();

  return (
    <Card className="rounded-lg border-border shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="size-4 text-primary" />
          {t("activity.recentTitle")}
        </CardTitle>
        <CardDescription>{t("activity.recentDesc")}</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("activity.empty")}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {logs.map((log) => (
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
                  <p className="text-xs text-foreground">
                    {formatActivityMessage(log, locale)}
                  </p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">
                    {formatRelativeTime(log.createdAt, locale)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
