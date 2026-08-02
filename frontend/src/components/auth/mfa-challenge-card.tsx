"use client";

import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";
import {
  ensureSupabaseAuthSession,
  listTotpFactors,
  persistSupabaseSessionToApp,
} from "@/lib/supabase-mfa";

type MfaChallengeCardProps = {
  onVerified: () => void | Promise<void>;
  onCancel: () => void;
};

export function MfaChallengeCard({ onVerified, onCancel }: MfaChallengeCardProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (code.trim().length < 6) return;
    setBusy(true);
    try {
      const { supabase } = await ensureSupabaseAuthSession();
      const factors = await listTotpFactors();
      const factor = factors.find((f) => f.status === "verified");
      if (!factor) {
        throw new Error(t("auth.mfaNoFactor"));
      }

      const challenge = await supabase.auth.mfa.challenge({
        factorId: factor.id,
      });
      if (challenge.error) throw new Error(challenge.error.message);

      const verified = await supabase.auth.mfa.verify({
        factorId: factor.id,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verified.error) throw new Error(verified.error.message);

      await persistSupabaseSessionToApp();
      toast.success(t("auth.mfaSuccess"));
      await onVerified();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("auth.mfaFail"),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-[var(--radius)] border border-zinc-800 bg-zinc-900 text-zinc-50 shadow-xl">
      <CardHeader className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <ShieldCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl text-zinc-50">
          {t("auth.mfaTitle")}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {t("auth.mfaSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa-login-code" className="text-zinc-200">
            {t("auth.mfaCode")}
          </Label>
          <Input
            id="mfa-login-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 8))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={busy || code.length < 6}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("auth.mfaVerify")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full text-zinc-400"
          disabled={busy}
          onClick={onCancel}
        >
          {t("auth.mfaCancel")}
        </Button>
      </CardContent>
    </Card>
  );
}
