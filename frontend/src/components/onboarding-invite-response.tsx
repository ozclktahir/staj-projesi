"use client";

import { useState } from "react";
import { toast } from "sonner";
import { respondToWorkspaceInvite } from "@/app/actions/notifications";
import type { PendingInvitationItem } from "@/lib/notification-utils";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UserPlus } from "lucide-react";

type OnboardingInviteResponseProps = {
  invitations: PendingInvitationItem[];
  /** Hiç davet kalmayınca (hepsi yanıtlandı) workspace oluşturma formuna geç. */
  onAllResolved: () => void;
  /** Tek bir davet yanıtlandığında üst bileşeni haberdar et. */
  onInvitationResolved?: (invitationId: string) => void;
};

export function OnboardingInviteResponse({
  invitations: initialInvitations,
  onAllResolved,
  onInvitationResolved,
}: OnboardingInviteResponseProps) {
  const [invitations, setInvitations] = useState(initialInvitations);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRespond(
    invitation: PendingInvitationItem,
    action: "accept" | "decline",
  ) {
    setBusyId(invitation.id);
    try {
      const result = await respondToWorkspaceInvite(invitation.id, action);
      if (!result.success) {
        toast.error(result.error ?? "İşlem başarısız oldu.");
        return;
      }

      if (action === "accept") {
        const ws = result.workspaceId || invitation.workspaceId;
        writeActiveWorkspaceId(ws);
        toast.success(`"${invitation.workspaceName}" çalışma alanına katıldın`);
        // Tam sayfa yükleme: cookie/aktif workspace sunucuya da yansısın.
        window.location.assign(`/?workspaceId=${encodeURIComponent(ws)}`);
        return;
      }

      toast.success("Davet reddedildi");
      const remaining = invitations.filter((i) => i.id !== invitation.id);
      setInvitations(remaining);
      onInvitationResolved?.(invitation.id);
      if (remaining.length === 0) onAllResolved();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "İşlem başarısız oldu.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => (
        <Card
          key={invitation.id}
          className="rounded-lg border-border bg-card shadow-sm"
        >
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserPlus className="size-4" />
              </span>
              <div>
                <CardTitle className="text-base text-foreground">
                  {invitation.workspaceName}
                </CardTitle>
                <CardDescription className="text-xs">
                  {invitation.role
                    ? `${invitation.role} olarak davet edildin`
                    : "Çalışma alanına davet edildin"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button
              type="button"
              className="flex-1 rounded-lg"
              disabled={busyId === invitation.id}
              onClick={() => void handleRespond(invitation, "accept")}
            >
              {busyId === invitation.id
                ? "Katılıyor…"
                : "Workspace'e Katıl"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1 rounded-lg"
              disabled={busyId === invitation.id}
              onClick={() => void handleRespond(invitation, "decline")}
            >
              Reddet
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
