"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { acceptInvitation } from "@/app/actions/invitations";
import {
  getMyNotifications,
  getMyPendingInvitations,
  type NotificationItem,
  type PendingInvitationItem,
} from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";

type InviteNotificationsMenuProps = {
  onAccepted?: () => void;
};

export function InviteNotificationsMenu({
  onAccepted,
}: InviteNotificationsMenuProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [invitations, setInvitations] = useState<PendingInvitationItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [invitesResult, notifResult] = await Promise.all([
        getMyPendingInvitations(),
        getMyNotifications(15),
      ]);
      if (invitesResult.success) setInvitations(invitesResult.invitations);
      if (notifResult.success) setNotifications(notifResult.notifications);
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

  const unreadCount =
    invitations.length +
    notifications.filter((n) => !n.isRead && n.type === "WORKSPACE_INVITE")
      .length;

  const handleAccept = async (invitation: PendingInvitationItem) => {
    setAcceptingId(invitation.id);
    try {
      const result = await acceptInvitation(invitation.id);
      if (!result.success) {
        toast.error(result.error);
        return;
      }

      writeActiveWorkspaceId(invitation.workspaceId);
      toast.success(`"${invitation.workspaceName}" daveti kabul edildi`);
      setInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      onAccepted?.();
      router.replace(`/?workspaceId=${encodeURIComponent(invitation.workspaceId)}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Davet kabul edilemedi.",
      );
    } finally {
      setAcceptingId(null);
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
          aria-label="Bildirimler"
        >
          <Bell className="size-5" />
          {unreadCount > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-semibold text-primary-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-80 rounded-lg border-border bg-card p-0"
      >
        <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold">
          Bildirimler
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto">
          {loading && invitations.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Yükleniyor…
            </p>
          ) : null}

          {!loading && invitations.length === 0 && notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              Bekleyen davet veya bildirim yok
            </p>
          ) : null}

          {invitations.length > 0 ? (
            <div className="space-y-1 p-2">
              <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Workspace davetleri
              </p>
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="rounded-md border border-border bg-background p-2.5"
                >
                  <p className="text-sm font-medium text-foreground">
                    {invitation.workspaceName}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Rol: {invitation.role ?? "Member"}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    className="mt-2 h-7 w-full rounded-md bg-primary text-xs text-primary-foreground hover:bg-primary/90"
                    disabled={acceptingId === invitation.id}
                    onClick={() => void handleAccept(invitation)}
                  >
                    {acceptingId === invitation.id
                      ? "Kabul ediliyor…"
                      : "Daveti Kabul Et"}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {notifications.filter((n) => n.type !== "WORKSPACE_INVITE" || n.isRead)
            .length > 0 ||
          notifications.some((n) => n.type === "WORKSPACE_INVITE" && !n.isRead) ? (
            <div className={cn("space-y-1 border-t border-border p-2")}>
              <p className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Diğer
              </p>
              {notifications
                .filter((n) => {
                  // Pending invite duplicate'lerini gizle (ayrı bölüm var)
                  if (n.type === "WORKSPACE_INVITE" && !n.isRead) {
                    const invId = n.metadata?.invitation_id;
                    if (
                      typeof invId === "string" &&
                      invitations.some((i) => i.id === invId)
                    ) {
                      return false;
                    }
                  }
                  return true;
                })
                .slice(0, 8)
                .map((n) => (
                  <div
                    key={n.id}
                    className={cn(
                      "rounded-md px-2 py-2",
                      n.isRead ? "opacity-70" : "bg-muted/40",
                    )}
                  >
                    <p className="text-xs font-medium text-foreground">
                      {n.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {n.message}
                    </p>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
