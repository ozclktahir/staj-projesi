"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ensureSupabaseAuthSession,
  listTotpFactors,
  persistSupabaseSessionToApp,
  type MfaFactorSummary,
} from "@/lib/supabase-mfa";
import { useTranslation } from "@/i18n/use-translation";

type EnrollState = {
  factorId: string;
  qrCode: string;
  secret: string;
} | null;

export function MfaSecurityPanel() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [factors, setFactors] = useState<MfaFactorSummary[]>([]);
  const [enroll, setEnroll] = useState<EnrollState>(null);
  const [code, setCode] = useState("");
  const [disableFactorId, setDisableFactorId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await ensureSupabaseAuthSession();
      const list = await listTotpFactors();
      setFactors(list.filter((f) => f.status === "verified"));
    } catch (error) {
      console.error("[MfaSecurityPanel]", error);
      toast.error(
        error instanceof Error ? error.message : t("security.loadError"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verified = factors[0] ?? null;

  async function startEnroll() {
    setBusy(true);
    setCode("");
    try {
      const { supabase } = await ensureSupabaseAuthSession();
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator",
      });
      if (error) throw new Error(error.message);
      setEnroll({
        factorId: data.id,
        qrCode: data.totp.qr_code,
        secret: data.totp.secret,
      });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("security.enrollError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function verifyEnroll() {
    if (!enroll || code.trim().length < 6) return;
    setBusy(true);
    try {
      const { supabase } = await ensureSupabaseAuthSession();
      const challenge = await supabase.auth.mfa.challenge({
        factorId: enroll.factorId,
      });
      if (challenge.error) throw new Error(challenge.error.message);

      const verifiedRes = await supabase.auth.mfa.verify({
        factorId: enroll.factorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verifiedRes.error) throw new Error(verifiedRes.error.message);

      await persistSupabaseSessionToApp();
      setEnroll(null);
      setCode("");
      toast.success(t("security.enabled"));
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("security.verifyError"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function disableFactor() {
    if (!disableFactorId || code.trim().length < 6) return;
    setBusy(true);
    try {
      const { supabase } = await ensureSupabaseAuthSession();
      const challenge = await supabase.auth.mfa.challenge({
        factorId: disableFactorId,
      });
      if (challenge.error) throw new Error(challenge.error.message);

      const verifiedRes = await supabase.auth.mfa.verify({
        factorId: disableFactorId,
        challengeId: challenge.data.id,
        code: code.trim(),
      });
      if (verifiedRes.error) throw new Error(verifiedRes.error.message);

      const { error } = await supabase.auth.mfa.unenroll({
        factorId: disableFactorId,
      });
      if (error) throw new Error(error.message);

      await persistSupabaseSessionToApp();
      setDisableFactorId(null);
      setCode("");
      toast.success(t("security.disabled"));
      await refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("security.disableError"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("security.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
        {verified ? (
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
        ) : (
          <ShieldOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
        )}
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium text-foreground">
            {verified ? t("security.statusOn") : t("security.statusOff")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("security.statusHint")}
          </p>
        </div>
      </div>

      {!verified && !enroll ? (
        <Button type="button" onClick={() => void startEnroll()} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : null}
          {t("security.enable")}
        </Button>
      ) : null}

      {enroll ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm text-foreground">{t("security.scanQr")}</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={enroll.qrCode}
            alt="TOTP QR"
            className="mx-auto size-48 rounded-md bg-white p-2"
          />
          <p className="break-all text-center font-mono text-xs text-muted-foreground">
            {enroll.secret}
          </p>
          <div className="space-y-2">
            <Label htmlFor="mfa-enroll-code">{t("security.codeLabel")}</Label>
            <Input
              id="mfa-enroll-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => void verifyEnroll()}
              disabled={busy || code.length < 6}
            >
              {t("security.confirmEnable")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEnroll(null);
                setCode("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}

      {verified && !disableFactorId ? (
        <Button
          type="button"
          variant="destructive"
          disabled={busy}
          onClick={() => {
            setDisableFactorId(verified.id);
            setCode("");
          }}
        >
          {t("security.disable")}
        </Button>
      ) : null}

      {disableFactorId ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm text-foreground">{t("security.disableHint")}</p>
          <div className="space-y-2">
            <Label htmlFor="mfa-disable-code">{t("security.codeLabel")}</Label>
            <Input
              id="mfa-disable-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => void disableFactor()}
              disabled={busy || code.length < 6}
            >
              {t("security.confirmDisable")}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setDisableFactorId(null);
                setCode("");
              }}
            >
              {t("common.cancel")}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
