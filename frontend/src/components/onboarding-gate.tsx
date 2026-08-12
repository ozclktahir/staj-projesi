"use client";

import { useState } from "react";
import { OnboardingCreateWorkspace } from "@/components/onboarding-create-workspace";
import { OnboardingInviteResponse } from "@/components/onboarding-invite-response";
import type { PendingInvitationItem } from "@/lib/notification-utils";

type OnboardingGateProps = {
  invitations: PendingInvitationItem[];
};

/** Bekleyen davet varsa önce onu göster; hepsi reddedilince workspace oluşturma formuna geç. */
export function OnboardingGate({ invitations }: OnboardingGateProps) {
  const [showCreateForm, setShowCreateForm] = useState(
    invitations.length === 0,
  );

  if (!showCreateForm) {
    return (
      <OnboardingInviteResponse
        invitations={invitations}
        onAllResolved={() => setShowCreateForm(true)}
      />
    );
  }

  return <OnboardingCreateWorkspace />;
}
