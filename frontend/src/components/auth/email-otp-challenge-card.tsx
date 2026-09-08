"use client";

import { useEffect, useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { isAxiosError } from "axios";
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
import apiClient from "@/lib/api-client";

const RESEND_COOLDOWN_SECONDS = 60;

export type EmailOtpTokens = {
  access_token: string;
  refresh_token?: string | null;
  user?: unknown;
};

type EmailOtpChallengeCardProps = {
  email: string;
  password: string;
  userId: string;
  onVerified: (tokens: EmailOtpTokens) => void | Promise<void>;
  onCancel: () => void;
};

export function EmailOtpChallengeCard({
  email,
  password,
  userId,
  onVerified,
  onCancel,
}: EmailOtpChallengeCardProps) {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  function apiErrorMessage(error: unknown, fallback: string): string {
    if (isAxiosError(error)) {
      const message = error.response?.data?.message;
      if (typeof message === "string") return message;
      if (Array.isArray(message) && message.length > 0) return String(message[0]);
    }
    return fallback;
  }

  async function submit() {
    if (code.trim().length !== 6) return;
    setBusy(true);
    try {
      const { data } = await apiClient.post<EmailOtpTokens>(
        "/auth/login/verify-otp",
        { user_id: userId, code: code.trim() },
      );
      toast.success(t("auth.otpSuccess"));
      await onVerified(data);
    } catch (error) {
      toast.error(apiErrorMessage(error, t("auth.otpFail")));
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (cooldown > 0 || busy) return;
    setBusy(true);
    try {
      await apiClient.post("/auth/login/request-otp", { email, password });
      toast.success(t("auth.otpResendSuccess"));
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (error) {
      toast.error(apiErrorMessage(error, t("auth.otpResendFail")));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="rounded-[var(--radius)] border border-zinc-800 bg-zinc-900 text-zinc-50 shadow-xl">
      <CardHeader className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20 text-primary">
          <MailCheck className="size-5" />
        </div>
        <CardTitle className="text-2xl text-zinc-50">
          {t("auth.otpTitle")}
        </CardTitle>
        <CardDescription className="text-zinc-400">
          {t("auth.otpSubtitle", { email })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email-otp-code" className="text-zinc-200">
            {t("auth.otpCode")}
          </Label>
          <Input
            id="email-otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="123456"
            className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50"
            value={code}
            onChange={(e) =>
              setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </div>
        <Button
          type="button"
          className="w-full"
          disabled={busy || code.length !== 6}
          onClick={() => void submit()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("auth.otpVerify")}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full border-zinc-800 text-zinc-300 hover:text-zinc-50"
          disabled={busy || cooldown > 0}
          onClick={() => void resend()}
        >
          {cooldown > 0
            ? t("auth.otpResendCountdown", { n: cooldown })
            : t("auth.otpResend")}
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
