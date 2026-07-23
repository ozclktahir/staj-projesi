"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import {
  acceptInvitation,
  declineInvitation,
} from "@/app/actions/invitations";
import {
  getMyNotifications,
  getMyPendingInvitations,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
  type PendingInvitationItem,
} from "@/app/actions/notifications";
import { isWorkspaceInviteNotification } from "@/lib/notification-utils";
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
import { cn } from "@/lib/utils";

type InviteNotificationsMenuProps = {
  onAccepted?: () => void;
};

function invitationIdFromNotification(n: NotificationItem): string | null {
  const meta = n.payload ?? n.metadata;
  if (!meta) return null;
  const id = meta.invitation_id ?? meta.invite_id;
  return typeof id === "string" && id.trim() ? id : null;
}

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
  const hydratedRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [invitesResult, notifResult] = await Promise.all([
        getMyPendingInvitations(),
        getMyNotifications(30),
      ]);
      if (invitesResult.success) setInvitations(invitesResult.invitations);
      if (notifResult.success) {
        setNotifications(notifResult.notifications);
        knownIdsRef.current = new Set(
          notifResult.notifications.map((n) => n.id),
        );
      }
      hydratedRef.current = true;
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

  // Supabase Realtime: kendi bildirimlerini dinle
  useEffect(() => {
    const client = createAuthedRealtimeClient();
    if (!client) return;

    let userId: string | null = null;
    let channel: ReturnType<typeof client.channel> | null = null;
    let cancelled = false;

    void (async () => {
      try {
        const { data } = await client.auth.getUser();
        // getUser JWT ile çalışmayabilir — token payload'dan dene
        userId = data.user?.id ?? null;
        if (!userId) {
          const token =
            typeof window !== "undefined"
              ? localStorage.getItem("access_token")
              : null;
          if (token) {
            try {
              const part = token.split(".")[1] ?? "";
              const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
              const padded = base64.padEnd(
                base64.length + ((4 - (base64.length % 4)) % 4),
                "=",
              );
              const payload = JSON.parse(atob(padded)) as { sub?: string };
              userId = payload.sub ?? null;
            } catch {
              userId = null;
            }
          }
        }

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
              toast.info(item.title || "Yeni bildirim", {
                description: item.message,
              });

              // Davet geldiyse pending listesini de yenile
              if (isWorkspaceInviteNotification(item)) {
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
          .subscribe();
      } catch (error) {
        console.warn("[InviteNotificationsMenu] realtime:", error);
      }
    })();

    return () => {
      cancelled = true;
      if (channel) {
        void client.removeChannel(channel);
      }
    };
  }, []);

  const unreadCount = useMemo(() => {
    const unreadNotifs = notifications.filter((n) => !n.isRead).length;
    const inviteIdsInNotifs = new Set(
      notifications
        .filter((n) => isWorkspaceInviteNotification(n) && !n.isRead)
        .map((n) => invitationIdFromNotification(n))
        .filter(Boolean),
    );
    const orphanInvites = invitations.filter(
      (inv) => !inviteIdsInNotifs.has(inv.id),
    ).length;
    return unreadNotifs + orphanInvites;
  }, [invitations, notifications]);

  const handleAcceptInvitation = async (
    invitationId: string,
    workspaceId: string,
    workspaceName: string,
  ) => {
    setBusyId(invitationId);
    try {
      const result = await acceptInvitation(invitationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      writeActiveWorkspaceId(workspaceId);
      toast.success(`"${workspaceName}" daveti kabul edildi`);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setNotifications((prev) =>
        prev.map((n) =>
          invitationIdFromNotification(n) === invitationId
            ? { ...n, isRead: true }
            : n,
        ),
      );
      onAccepted?.();
      setOpen(false);
      router.replace(`/?workspaceId=${encodeURIComponent(workspaceId)}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Davet kabul edilemedi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleDeclineInvitation = async (invitationId: string) => {
    setBusyId(invitationId);
    try {
      const result = await declineInvitation(invitationId);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success("Davet reddedildi");
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      setNotifications((prev) =>
        prev.map((n) =>
          invitationIdFromNotification(n) === invitationId
            ? { ...n, isRead: true }
            : n,
        ),
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Davet reddedilemedi.",
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      const result = await markAllNotificationsRead();
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
      void markNotificationRead(n.id);
      setNotifications((prev) =>
        prev.map((item) =>
          item.id === n.id ? { ...item, isRead: true } : item,
        ),
      );
    }
    if (n.link) {
      setOpen(false);
      router.push(n.link);
    }
  };

  // Davet kartları: pending invitations + unread invite notifications birleştir
  const inviteCards = useMemo(() => {
    const byId = new Map<
      string,
      {
        invitationId: string;
        workspaceId: string;
        workspaceName: string;
        message: string;
        notificationId?: string;
      }
    >();

    for (const inv of invitations) {
      byId.set(inv.id, {
        invitationId: inv.id,
        workspaceId: inv.workspaceId,
        workspaceName: inv.workspaceName,
        message: `Sizi "${inv.workspaceName}" çalışma alanına davet ettiler.`,
      });
    }

    for (const n of notifications) {
      if (!isWorkspaceInviteNotification(n) || n.isRead) continue;
      const invId = invitationIdFromNotification(n);
      if (!invId) continue;
      const existing = byId.get(invId);
      const workspaceName =
        (typeof n.payload?.workspace_name === "string" &&
          n.payload.workspace_name) ||
        (typeof n.metadata?.workspace_name === "string" &&
          n.metadata.workspace_name) ||
        existing?.workspaceName ||
        "Workspace";
      const workspaceId =
        n.workspaceId ||
        (typeof n.payload?.workspace_id === "string"
          ? n.payload.workspace_id
          : existing?.workspaceId) ||
        "";

      byId.set(invId, {
        invitationId: invId,
        workspaceId,
        workspaceName,
        message: n.message || existing?.message || "",
        notificationId: n.id,
      });
    }

    return [...byId.values()];
  }, [invitations, notifications]);

  const otherNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        if (isWorkspaceInviteNotification(n) && !n.isRead) return false;
        return true;
      }),
    [notifications],
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-[var(--radius)] text-muted-foreground hover:text-foreground"
          aria-label="Bildirimler"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-semibold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[22rem] rounded-lg border-border bg-card p-0"
      >
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            Bildirimler
          </DropdownMenuLabel>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 gap-1 px-2 text-[11px] text-muted-foreground hover:text-foreground"
            disabled={markingAll || unreadCount === 0}
            onClick={() => void handleMarkAllRead()}
          >
            <CheckCheck className="size-3.5" />
            Tümünü Okundu İşaretle
          </Button>
        </div>
        <DropdownMenuSeparator />

        <div className="max-h-96 overflow-y-auto">
          {loading &&
          invitations.length === 0 &&
          notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Yükleniyor…
            </p>
          ) : null}

          {!loading &&
          inviteCards.length === 0 &&
          otherNotifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Bildirim yok
            </p>
          ) : null}

          {inviteCards.length > 0 ? (
            <div className="space-y-2 p-2">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Workspace davetleri
              </p>
              {inviteCards.map((card) => (
                <div
                  key={card.invitationId}
                  className="rounded-md border border-border bg-background p-2.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {card.workspaceName}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {card.message}
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 flex-1 rounded-md bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                      disabled={
                        busyId === card.invitationId || !card.workspaceId
                      }
                      onClick={() =>
                        void handleAcceptInvitation(
                          card.invitationId,
                          card.workspaceId,
                          card.workspaceName,
                        )
                      }
                    >
                      {busyId === card.invitationId
                        ? "İşleniyor…"
                        : "Kabul Et"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 flex-1 rounded-md border-border text-xs"
                      disabled={busyId === card.invitationId}
                      onClick={() =>
                        void handleDeclineInvitation(card.invitationId)
                      }
                    >
                      Reddet
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {otherNotifications.length > 0 ? (
            <div
              className={cn(
                "space-y-1 p-2",
                inviteCards.length > 0 && "border-t border-border",
              )}
            >
              <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Son bildirimler
              </p>
              {otherNotifications.slice(0, 12).map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => void handleNotificationClick(n)}
                  className={cn(
                    "w-full rounded-md px-2 py-2 text-left transition-colors hover:bg-muted/60",
                    n.isRead ? "opacity-70" : "bg-muted/40",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-medium text-foreground">
                      {n.title}
                    </p>
                    {!n.isRead ? (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-red-500" />
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-1 text-[10px] text-muted-foreground/80">
                    {formatRelativeTime(n.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
