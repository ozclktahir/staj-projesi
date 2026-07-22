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
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspaceId) {
      toast.error("Önce bir workspace seçin.");
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
      toast.success(`Davet gönderildi: ${email.trim()}`);
      setEmail("");
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Davet oluşturulamadı.",
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
          <DialogTitle className="text-foreground">Üye Davet Et</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {workspaceName
              ? `"${workspaceName}" çalışma alanına e-posta ile davet gönder.`
              : "Çalışma alanına e-posta ile davet gönder."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          <div className="space-y-2">
            <Label htmlFor="invite-email">E-posta</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="uye@sirket.com"
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
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !email.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Gönderiliyor…" : "Davet Gönder"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
