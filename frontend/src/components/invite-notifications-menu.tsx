"use client";

import { useCallback, useEffect, useMemo, useOptimistic, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BellOff,
  Check,
  CheckCheck,
  ClipboardList,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  clearAllNotifications,
  deleteNotification,
  getMyNotifications,
  getMyPendingInvitations,
  markAllNotificationsRead,
  markNotificationRead,
  respondToWorkspaceInvite,
} from "@/app/actions/notifications";
import { emitTaskAssignmentChange } from "@/lib/client-cache";
import {
  approveTaskDeletion,
  rejectTaskDeletion,
} from "@/app/actions/task-deletion-approval";
import { respondToTaskClaim } from "@/app/actions/task-workflows";
import {
  getNotificationKind,
  invitationIdFromNotification,
  isActionableTaskNotification,
  isWorkspaceInviteNotification,
  notificationHref,
  taskIdFromNotification,
  type NotificationItem,
  type PendingInvitationItem,
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
import { AUTH_TOKEN_REFRESHED_EVENT } from "@/lib/auth-token-refresh";
import { formatRelativeTime } from "@/lib/format-relative-time";
import { createAuthedRealtimeClient } from "@/lib/supabase/client";
import {
  decodeAccessTokenClaims,
  resolveRealtimeUserId,
} from "@/lib/supabase/realtime";
import { useTranslation } from "@/i18n/use-translation";
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
    title: String(row.title ?? "Notification"),
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
  const { t, locale } = useTranslation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitationItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);
  const [notifHasMore, setNotifHasMore] = useState(false);
  const [loadingMoreNotifs, setLoadingMoreNotifs] = useState(false);
  const [resolvedActionIds, setResolvedActionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [, startTransition] = useTransition();
  const knownIdsRef = useRef<Set<string>>(new Set());
  // JWT sessizce yenilendiğinde artıyor — aşağıdaki realtime effect'i
  // yeni token'la abone olmaya zorlar (eski client eski token'ı kullanmaya
  // devam ederdi, bkz. lib/auth-token-refresh.ts).
  const [tokenVersion, setTokenVersion] = useState(0);

  useEffect(() => {
    const onRefreshed = () => setTokenVersion((v) => v + 1);
    window.addEventListener(AUTH_TOKEN_REFRESHED_EVENT, onRefreshed);
    return () =>
      window.removeEventListener(AUTH_TOKEN_REFRESHED_EVENT, onRefreshed);
  }, []);

  type NotifOptimisticAction =
    | { type: "delete"; id: string }
    | { type: "clear" }
    | { type: "markAllRead" }
    | { type: "markRead"; id: string };

  const [optimisticNotifications, applyNotifOptimistic] = useOptimistic(
    notifications,
    (state, action: NotifOptimisticAction) => {
      switch (action.type) {
        case "delete":
          return state.filter((n) => n.id !== action.id);
        case "clear":
          return [];
        case "markAllRead":
          return state.map((n) => ({ ...n, isRead: true }));
        case "markRead":
          return state.map((n) =>
            n.id === action.id ? { ...n, isRead: true } : n,
          );
        default:
          return state;
      }
    },
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [invitesResult, notifResult] = await Promise.all([
        getMyPendingInvitations(),
        getMyNotifications(20, 0),
      ]);
      if (invitesResult.success) setInvitations(invitesResult.invitations);
      if (notifResult.success) {
        setNotifications(notifResult.notifications);
        setNotifHasMore(Boolean(notifResult.hasMore));
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
                  ? t("notifications.newInvite")
                  : t("notifications.newNotification"),
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
              toast.info(t("notifications.newInvite"));
            },
          )
          .subscribe((status, err) => {
            // Önceden hiç izlenmiyordu — abonelik sessizce düşünce (süresi
            // dolan JWT, ağ kopması) fark edilemiyordu. Token yenilendiğinde
            // (tokenVersion) bu effect zaten yeniden çalışıp taze bir
            // client/kanal kuracak; burada yalnızca teşhis için logluyoruz.
            if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              console.warn(
                "[InviteNotificationsMenu] realtime status:",
                status,
                err,
              );
            }
          });
      } catch (error) {
        console.warn("[InviteNotificationsMenu] realtime:", error);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void client.removeChannel(channel);
    };
  }, [tokenVersion]);

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

    for (const n of optimisticNotifications) {
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
  }, [invitations, optimisticNotifications]);

  const unreadCount = useMemo(() => {
    const unreadNotifs = optimisticNotifications.filter((n) => !n.isRead).length;
    const covered = new Set(
      optimisticNotifications
        .filter((n) => isWorkspaceInviteNotification(n))
        .map((n) => invitationIdFromNotification(n))
        .filter(Boolean),
    );
    const orphanInvites = invitations.filter(
      (inv) => !covered.has(inv.id),
    ).length;
    return unreadNotifs + orphanInvites;
  }, [invitations, optimisticNotifications]);

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
        toast.error(result.error ?? t("notifications.actionFailed"));
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
        error instanceof Error ? error.message : t("notifications.inviteFailed"),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleTaskWorkflowRespond = async (
    notification: NotificationItem,
    action: "accept" | "decline",
  ) => {
    const kind = getNotificationKind(notification);
    setBusyId(notification.id);

    startTransition(() => {
      void (async () => {
        try {
          let result: { success: boolean; message?: string; error?: string };

          if (kind === "task_deletion_request") {
            const taskId = taskIdFromNotification(notification) ?? "";
            result =
              action === "accept"
                ? await approveTaskDeletion(taskId, notification.id)
                : await rejectTaskDeletion(taskId, notification.id);
          } else {
            result = await respondToTaskClaim(notification.id, action);
          }

          if (!result.success) {
            toast.error(
              result.error ??
                "Silme işlemi veritabanı engeli nedeniyle başarısız oldu",
            );
            return;
          }

          // Kanban board'u anında haberdar et — router.refresh()/realtime
          // gecikmesini beklemeden "onay bekliyor" rozetini temizler.
          if (kind !== "task_deletion_request") {
            const taskId = taskIdFromNotification(notification);
            if (taskId) {
              emitTaskAssignmentChange({
                taskId,
                kind: action === "accept" ? "accepted" : "rejected",
              });
            }
          }

          setResolvedActionIds((prev) => new Set(prev).add(notification.id));
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notification.id),
          );
          toast.success(
            result.message ??
              (kind === "task_deletion_request" && action === "accept"
                ? "Silme talebi onaylandı — görev kaldırıldı"
                : "İşlem tamamlandı"),
          );

          // Kanban / listeleri anında yenile
          router.refresh();
          if (
            kind === "task_deletion_request" &&
            action === "accept" &&
            typeof window !== "undefined"
          ) {
            // Soft cache'li client sayfalar için ikinci bir yenileme
            window.setTimeout(() => router.refresh(), 150);
          }
        } catch (error) {
          console.error("[handleTaskWorkflowRespond]", error);
          toast.error(
            error instanceof Error ? error.message : "İşlem başarısız oldu",
          );
        } finally {
          setBusyId(null);
        }
      })();
    });
  };

  const handleLoadMoreNotifications = () => {
    if (loadingMoreNotifs || !notifHasMore) return;
    setLoadingMoreNotifs(true);
    startTransition(() => {
      void (async () => {
        try {
          const result = await getMyNotifications(20, notifications.length);
          if (!result.success) {
            toast.error(result.error ?? t("notifications.loadFailed"));
            return;
          }
          setNotifications((prev) => {
            const seen = new Set(prev.map((n) => n.id));
            const merged = [...prev];
            for (const n of result.notifications) {
              if (!seen.has(n.id)) {
                merged.push(n);
                knownIdsRef.current.add(n.id);
              }
            }
            return merged;
          });
          setNotifHasMore(Boolean(result.hasMore));
        } finally {
          setLoadingMoreNotifs(false);
        }
      })();
    });
  };

  const handleMarkAllRead = () => {
    setMarkingAll(true);
    startTransition(() => {
      applyNotifOptimistic({ type: "markAllRead" });
      void (async () => {
        try {
          const result = await markAllNotificationsRead();
          if (!result.success) {
            toast.error(result.error ?? t("notifications.actionFailed"));
            return;
          }
          setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
          toast.success(t("notifications.markedAllRead"));
        } finally {
          setMarkingAll(false);
        }
      })();
    });
  };

  const handleDeleteNotification = (notificationId: string) => {
    knownIdsRef.current.delete(notificationId);
    setBusyId(notificationId);
    startTransition(() => {
      applyNotifOptimistic({ type: "delete", id: notificationId });
      void (async () => {
        try {
          const result = await deleteNotification(notificationId);
          if (!result.success) {
            toast.error(result.error ?? "Bildirim silinemedi");
            return;
          }
          setNotifications((prev) =>
            prev.filter((n) => n.id !== notificationId),
          );
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Bildirim silinemedi",
          );
        } finally {
          setBusyId(null);
        }
      })();
    });
  };

  const handleClearAllNotifications = () => {
    if (notifications.length === 0) return;
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            t("notifications.clearConfirm"),
          )
        : true;
    if (!confirmed) return;

    setClearingAll(true);
    knownIdsRef.current = new Set();
    startTransition(() => {
      applyNotifOptimistic({ type: "clear" });
      void (async () => {
        try {
          const result = await clearAllNotifications();
          if (!result.success) {
            toast.error(result.error ?? "Bildirimler temizlenemedi");
            return;
          }
          setNotifications([]);
          toast.success(t("notifications.clearedAll"));
        } catch (error) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Bildirimler temizlenemedi",
          );
        } finally {
          setClearingAll(false);
        }
      })();
    });
  };

  /**
   * Bildirimin hedefine git. Bildirim başka bir workspace'e aitse önce aktif
   * workspace'i oraya çeviririz; aksi hâlde hedef sayfa "bu alana erişiminiz
   * yok" ile açılırdı.
   */
  const navigateToNotification = useCallback(
    (n: NotificationItem) => {
      const href = notificationHref(n);
      if (!href) return;

      const meta = n.payload ?? n.metadata;
      const workspaceId =
        n.workspaceId ||
        (meta && typeof meta.workspace_id === "string"
          ? meta.workspace_id
          : null);
      if (workspaceId) writeActiveWorkspaceId(workspaceId);

      setOpen(false);
      router.push(href);
      router.refresh();
    },
    [router],
  );

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.isRead) {
      startTransition(() => {
        applyNotifOptimistic({ type: "markRead", id: n.id });
        void (async () => {
          try {
            const result = await markNotificationRead(n.id);
            if (!result.success) {
              toast.error(result.error ?? t("notifications.updateFailed"));
              return;
            }
            setNotifications((prev) =>
              prev.map((item) =>
                item.id === n.id ? { ...item, isRead: true } : item,
              ),
            );
          } catch (error) {
            console.error("[handleNotificationClick]", error);
            toast.error(t("notifications.updateFailed"));
          }
        })();
      });
    }

    navigateToNotification(n);
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
              ? t("notifications.ariaUnread", { n: unreadCount })
              : t("notifications.title")
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
              {t("notifications.title")}
            </DropdownMenuLabel>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {unreadCount > 0
                ? t("notifications.unreadLong", { n: unreadCount })
                : notifications.length > 0
                  ? t("notifications.allRead")
                  : t("notifications.listEmpty")}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              disabled={markingAll || unreadCount === 0}
              onClick={() => void handleMarkAllRead()}
            >
              <CheckCheck className="size-3.5" />
              {t("notifications.markAll")}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={clearingAll || notifications.length === 0}
              onClick={() => void handleClearAllNotifications()}
            >
              <Trash2 className="size-3.5" />
              {clearingAll
                ? t("notifications.clearing")
                : t("notifications.clearAll")}
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-[28rem] overflow-y-auto">
          {loading && feed.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-muted-foreground">
              {t("notifications.loading")}
            </p>
          ) : null}

          {!loading && feed.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="size-5" />
              </span>
              <p className="text-sm font-medium text-foreground">
                {t("notifications.emptyTitle")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("notifications.emptyHint")}
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
                          {formatRelativeTime(entry.createdAt, locale)}
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
              const actionable =
                isActionableTaskNotification(n) &&
                !resolvedActionIds.has(n.id);
              const Icon =
                kind === "task_assigned" || kind === "task_claim_request"
                  ? ClipboardList
                  : kind === "task_deletion_request"
                    ? Trash2
                    : kind === "due_date_warning"
                      ? AlertTriangle
                      : kind === "workspace_invite"
                        ? UserPlus
                        : Bell;

              const iconWrap =
                kind === "due_date_warning"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                  : kind === "task_deletion_request"
                    ? "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                    : kind === "task_assigned" || kind === "task_claim_request"
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400"
                      : "bg-muted text-muted-foreground";

              if (actionable) {
                return (
                  <li
                    key={entry.key}
                    className="group relative rounded-lg border border-border bg-accent/40 p-3"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1.5 top-1.5 size-7 text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                      disabled={busyId === n.id}
                      aria-label="Bildirimi sil"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteNotification(n.id);
                      }}
                    >
                      <X className="size-3.5" />
                    </Button>
                    <div className="flex gap-2.5 pr-7">
                      <span
                        className={cn(
                          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                          iconWrap,
                        )}
                      >
                        <Icon className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => navigateToNotification(n)}
                          className="w-full text-left"
                        >
                          <p className="text-sm font-medium text-foreground hover:underline">
                            {n.title || "Bildirim"}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {n.message}
                          </p>
                        </button>
                        <p className="mt-1 text-[10px] text-muted-foreground/80">
                          {formatRelativeTime(n.createdAt, locale)}
                        </p>
                        <div className="mt-2.5 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-7 flex-1 gap-1 rounded-md text-xs"
                            disabled={busyId === n.id}
                            onClick={() =>
                              void handleTaskWorkflowRespond(n, "accept")
                            }
                          >
                            <Check className="size-3.5" />
                            {busyId === n.id
                              ? "…"
                              : kind === "task_deletion_request"
                                ? "Silmeyi Onayla"
                                : "Kabul Et"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 flex-1 gap-1 rounded-md text-xs"
                            disabled={busyId === n.id}
                            onClick={() =>
                              void handleTaskWorkflowRespond(n, "decline")
                            }
                          >
                            <X className="size-3.5" />
                            Reddet
                          </Button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              }

              return (
                <li key={entry.key} className="group relative">
                  <button
                    type="button"
                    onClick={() => void handleNotificationClick(n)}
                    className={cn(
                      "flex w-full gap-2.5 rounded-lg border border-transparent px-2.5 py-2.5 pr-9 text-left transition-colors hover:bg-muted/50",
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
                        {formatRelativeTime(n.createdAt, locale)}
                      </p>
                    </div>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1.5 size-7 text-muted-foreground opacity-70 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                    disabled={busyId === n.id}
                    aria-label="Bildirimi sil"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteNotification(n.id);
                    }}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
          {notifHasMore ? (
            <div className="border-t border-border p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-full text-xs"
                disabled={loadingMoreNotifs}
                onClick={handleLoadMoreNotifications}
              >
                {loadingMoreNotifs
                  ? t("notifications.loading")
                  : t("notifications.loadMore")}
              </Button>
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Alias */
export const NotificationPopover = InviteNotificationsMenu;
export const NotificationDropdown = InviteNotificationsMenu;
