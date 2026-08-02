"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createInvitation } from "@/app/actions/invitations";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/use-translation";

type InviteMemberModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string | null;
  workspaceName?: string | null;
};

export function InviteMemberModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: InviteMemberModalProps) {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId) {
      toast.error(t("invite.needWorkspace"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await createInvitation({
        workspaceId,
        email,
        role: "Member",
      });
      if (!result.success) {
        console.error("[InviteMemberModal]", result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        t("invite.successNamed", { email: email.trim() }),
      );
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("invite.failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setEmail("");
      }}
    >
      <DialogContent className="rounded-lg border border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-foreground">
            {t("invite.title")}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {workspaceName
              ? t("invite.hintNamed", { name: workspaceName })
              : t("invite.hint")}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">{t("invite.emailLabel")}</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("invite.emailPlaceholder")}
              disabled={isSubmitting}
              className="rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => onOpenChange(false)}
              className="rounded-lg"
            >
              {t("invite.cancel")}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? t("invite.sending") : t("invite.send")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
