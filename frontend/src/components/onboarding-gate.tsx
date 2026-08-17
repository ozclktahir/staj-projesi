"use client";

import { useState } from "react";
import { OnboardingCreateWorkspace } from "@/components/onboarding-create-workspace";
import { OnboardingInviteResponse } from "@/components/onboarding-invite-response";
import { Button } from "@/components/ui/button";
import type { PendingInvitationItem } from "@/lib/notification-utils";

type OnboardingGateProps = {
  invitations: PendingInvitationItem[];
};

/**
 * Kayıt sonrası akış:
 * - Bekleyen davet VARSA önce davet kartı(ları) gösterilir → "Workspace'e Katıl"
 *   ile davet kabul edilir ve kullanıcı doğrudan o çalışma alanına girer.
 * - Davet YOKSA (veya hepsi reddedilirse / kullanıcı kendi alanını kurmak
 *   isterse) workspace oluşturma ekranı gösterilir.
 */
export function OnboardingGate({ invitations }: OnboardingGateProps) {
  const [showCreateForm, setShowCreateForm] = useState(
    invitations.length === 0,
  );
  const [remainingInvites, setRemainingInvites] = useState(invitations);

  if (!showCreateForm) {
    return (
      <div className="space-y-4">
        <OnboardingInviteResponse
          invitations={remainingInvites}
          onAllResolved={() => setShowCreateForm(true)}
          onInvitationResolved={(id) =>
            setRemainingInvites((prev) => prev.filter((i) => i.id !== id))
          }
        />
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowCreateForm(true)}
          >
            Daveti şimdilik beklet, kendi workspace&apos;imi oluşturayım
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <OnboardingCreateWorkspace />
      {remainingInvites.length > 0 ? (
        <div className="text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowCreateForm(false)}
          >
            Bekleyen davetime geri dön ({remainingInvites.length})
          </Button>
        </div>
      ) : null}
    </div>
  );
}
