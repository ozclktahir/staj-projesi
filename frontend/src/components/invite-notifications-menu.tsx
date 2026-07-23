"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  ClipboardList,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import {
  getMyNotifications,
  getMyPendingInvitations,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  respondToWorkspaceInvite,
  type NotificationItem,
  type PendingInvitationItem,
} from "@/app/actions/notifications";
import {
  getNotificationKind,
  invitationIdFromNotification,
  isWorkspaceInviteNotification,
  taskLinkFromNotification,
} from "@/lib/notification-utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import {
  decodeAccessTokenClaims,
  resolveRealtimeUserId,
} from "@/lib/supabase/realtime";
import { cn } from "@/lib/utils";

type InviteNotificationsMenuProps = {
  onAccepted?: () => void;
};

type FeedInvite = {
  kind: "invite";
  key: string;
  invitationId: string;
  workspaceId: string;
  workspaceName: string;
  message: string;
  createdAt: string | null;
  isRead: false;
};

type FeedNotif = {
  kind: "notification";
  key: string;
  item: NotificationItem;
  createdAt: string | null;
  isRead: boolean;
};

type FeedItem = FeedInvite | FeedNotif;

function mapRealtimeRow(row: Record<string, unknown>): NotificationItem {
  const metadata =
    row.metadata && typeof row.metadata === "object"
      ? (row.metadata as Record<string, unknown>)
      : null;
  const payload =
    row.payload && typeof row.payload === "object"
      ? (row.payload as Record<string, unknown>)
      : metadata;

  return {
    id: String(row.id),
    workspaceId: (row.workspace_id as string | null) ?? null,
    type: String(row.type ?? ""),
    title: String(row.title ?? "Bildirim"),
    message: String(row.message ?? ""),
    isRead: Boolean(row.is_read),
    createdAt: (row.created_at as string | null) ?? null,
    link: (row.link as string | null) ?? null,
    metadata,
    payload,
  };
}

function sortByDateDesc(a: FeedItem, b: FeedItem): number {
  const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return tb - ta;
}

export function InviteNotificationsMenu({
  onAccepted,
}: InviteNotificationsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitationItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const knownIdsRef = useRef<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [invitesResult, notifResult] = await Promise.all([
        getMyPendingInvitations(),
        getMyNotifications(40),
      ]);
      if (invitesResult.success) setInvitations(invitesResult.invitations);
      if (notifResult.success) {
        setNotifications(notifResult.notifications);
        knownIdsRef.current = new Set(
          notifResult.notifications.map((n) => n.id),
        );
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  useEffect(() => {
    const client = createAuthedRealtimeClient();
    if (!client) return;

    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const userId = await resolveRealtimeUserId(client);
        const { email } = decodeAccessTokenClaims();
        if (!userId || cancelled) return;

        channel = client
          .channel(`notifications:${userId}`)
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              if (!row?.id) return;
              const item = mapRealtimeRow(row);
              if (knownIdsRef.current.has(item.id)) return;
              knownIdsRef.current.add(item.id);

              setNotifications((prev) => [item, ...prev].slice(0, 40));

              const isInvite = isWorkspaceInviteNotification(item);
              toast.info(
                isInvite
                  ? "Yeni bir Workspace daveti aldınız!"
                  : "Yeni bir bildirim aldınız!",
                { description: item.message || item.title },
              );

              if (isInvite) {
                void getMyPendingInvitations().then((result) => {
                  if (result.success) setInvitations(result.invitations);
                });
              }
            },
          )
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "notifications",
              filter: `user_id=eq.${userId}`,
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              if (!row?.id) return;
              const item = mapRealtimeRow(row);
              setNotifications((prev) =>
                prev.map((n) => (n.id === item.id ? item : n)),
              );
            },
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "workspace_invitations",
            },
            (payload) => {
              const row = payload.new as Record<string, unknown>;
              const inviteEmail =
                typeof row.email === "string"
                  ? row.email.toLowerCase().trim()
                  : "";
              const myEmail = email?.toLowerCase().trim() ?? "";
              if (!inviteEmail || !myEmail || inviteEmail !== myEmail) return;

              void getMyPendingInvitations().then((result) => {
                if (result.success) setInvitations(result.invitations);
              });
              toast.info("Yeni bir Workspace daveti aldınız!");
            },
          )
          .subscribe();
      } catch (error) {
        console.warn("[InviteNotificationsMenu] realtime:", error);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, []);

  const feed = useMemo((): FeedItem[] => {
    const inviteIdsShown = new Set<string>();
    const items: FeedItem[] = [];

    for (const inv of invitations) {
      inviteIdsShown.add(inv.id);
      items.push({
        kind: "invite",
        key: `inv-${inv.id}`,
        invitationId: inv.id,
        workspaceId: inv.workspaceId,
        workspaceName: inv.workspaceName,
        message: `Sizi "${inv.workspaceName}" çalışma alanına davet ettiler.`,
        createdAt: inv.createdAt,
        isRead: false,
      });
    }

    for (const n of notifications) {
      if (isWorkspaceInviteNotification(n)) {
        const invId = invitationIdFromNotification(n);
        if (invId && inviteIdsShown.has(invId)) continue;
        if (invId && !n.isRead) {
          inviteIdsShown.add(invId);
          const workspaceName =
            (typeof n.payload?.workspace_name === "string" &&
              n.payload.workspace_name) ||
            (typeof n.metadata?.workspace_name === "string" &&
              n.metadata.workspace_name) ||
            "Workspace";
          const workspaceId =
            n.workspaceId ||
            (typeof n.payload?.workspace_id === "string"
              ? n.payload.workspace_id
              : "") ||
            "";
          items.push({
            kind: "invite",
            key: `inv-n-${n.id}`,
            invitationId: invId,
            workspaceId,
            workspaceName,
            message: n.message || `Sizi "${workspaceName}" alanına davet ettiler.`,
            createdAt: n.createdAt,
            isRead: false,
          });
          continue;
        }
        // Okunmuş davet bildirimi: normal satır olarak göster
      }

      items.push({
        kind: "notification",
        key: `n-${n.id}`,
        item: n,
        createdAt: n.createdAt,
        isRead: n.isRead,
      });
    }

    return items.sort(sortByDateDesc);
  }, [invitations, notifications]);

  const unreadCount = useMemo(() => {
    const unreadNotifs = notifications.filter((n) => !n.isRead).length;
    const covered = new Set(
      notifications
        .filter((n) => isWorkspaceInviteNotification(n))
        .map((n) => invitationIdFromNotification(n))
        .filter(Boolean),
    );
    const orphanInvites = invitations.filter(
      (inv) => !covered.has(inv.id),
    ).length;
    return unreadNotifs + orphanInvites;
  }, [invitations, notifications]);

  const handleRespond = async (
    invitationId: string,
    action: "accept" | "decline",
    workspaceId: string,
    workspaceName: string,
  ) => {
    setBusyId(invitationId);
    try {
      const result = await respondToWorkspaceInvite(invitationId, action);
      if (!result.success) {
        toast.error(result.error ?? "İşlem başarısız");
        return;
      }

      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setNotifications((prev) =>
        prev.map((n) =>
          invitationIdFromNotification(n) === invitationId
            ? { ...n, isRead: true }
            : n,
        ),
      );

      if (action === "accept") {
        const ws = result.workspaceId || workspaceId;
        writeActiveWorkspaceId(ws);
        toast.success(`"${workspaceName}" daveti kabul edildi`);
        onAccepted?.();
        setOpen(false);
        router.replace(`/?workspaceId=${encodeURIComponent(ws)}`);
        router.refresh();
      } else {
        toast.success("Davet reddedildi");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Davet işlemi başarısız.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const result = await markAllNotificationsAsRead();
      if (!result.success) {
        toast.error(result.error ?? "İşlem başarısız");
        return;
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      toast.success("Tüm bildirimler okundu");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      void markNotificationAsRead(n.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, isRead: true } : item,
        ),
      );
    }

    const href = taskLinkFromNotification(n);
    if (href) {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-[var(--radius)] text-muted-foreground hover:text-foreground"
          aria-label={
            unreadCount > 0
              ? `Bildirimler (${unreadCount} okunmamış)`
              : "Bildirimler"
          }
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[24rem] rounded-lg border-border bg-card p-0 shadow-lg"
      >
        <div className="flex items-start justify-between gap-2 px-3 py-2.5">
          <div>
            <DropdownMenuLabel className="p-0 text-sm font-semibold">
              Bildirimler
            </DropdownMenuLabel>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} okunmamış bildirim`
                : "Tümü okundu"}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            disabled={markingAll || unreadCount === 0}
            onClick={() => void handleMarkAllRead()}
          >
            <CheckCheck className="size-3.5" />
            Tümünü Okundu İşaretle
          </Button>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[28rem] overflow-y-auto">
          {loading && feed.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              Yükleniyor…
            </p>
          ) : null}

          {!loading && feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                Henüz yeni bir bildiriminiz yok
              </p>
              <p className="text-xs text-muted-foreground">
                Davetler, görev atamaları ve hatırlatmalar burada görünür.
              </p>
            </div>
          ) : null}

          <ul className="space-y-1 p-2">
            {feed.map((entry) => {
              if (entry.kind === "invite") {
                return (
                  <li
                    key={entry.key}
                    className="rounded-lg border border-border bg-accent/40 p-3"
                  >
                    <div className="flex gap-2.5">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                        <UserPlus className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <p className="text-sm font-medium text-foreground">
                            Çalışma alanı daveti
                          </p>
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500" />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {entry.message}
                        </p>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          {formatRelativeTime(entry.createdAt)}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 flex-1 rounded-md text-xs"
                            disabled={
                              busyId === entry.invitationId ||
                              !entry.workspaceId
                            }
                            onClick={() =>
                              void handleRespond(
                                entry.invitationId,
                                "accept",
                                entry.workspaceId,
                                entry.workspaceName,
                              )
                            }
                          >
                            {busyId === entry.invitationId
                              ? "İşleniyor…"
                              : "Kabul Et"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 rounded-md text-xs"
                            disabled={busyId === entry.invitationId}
                            onClick={() =>
                              void handleRespond(
                                entry.invitationId,
                                "decline",
                                entry.workspaceId,
                                entry.workspaceName,
                              )
                            }
                          >
                            Reddet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }

              const n = entry.item;
              const kind = getNotificationKind(n);
              const Icon =
                kind === "task_assigned"
                  ? ClipboardList
                  : kind === "due_date_warning"
                    ? AlertTriangle
                    : kind === "workspace_invite"
                      ? UserPlus
                      : Bell;

              const iconWrap =
                kind === "due_date_warning"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : kind === "task_assigned"
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400"
                    : "bg-muted text-muted-foreground";

              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => void handleNotificationClick(n)}
                    className={cn(
                      "flex w-full gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 text-left transition-colors hover:bg-muted/50",
                      !n.isRead && "border-border/60 bg-accent/40",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                        iconWrap,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {n.title || "Bildirim"}
                        </p>
                        {!n.isRead ? (
                          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-sky-500" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/80">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Alias */
export const NotificationPopover = InviteNotificationsMenu;
export const NotificationDropdown = InviteNotificationsMenu;
