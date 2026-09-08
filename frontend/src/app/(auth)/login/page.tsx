"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { resolvePostLoginRedirect } from "@/app/actions/notifications";
import { setActiveWorkspaceCookie } from "@/app/actions/set-active-workspace";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
import {
  EmailOtpChallengeCard,
  type EmailOtpTokens,
} from "@/components/auth/email-otp-challenge-card";
import { MfaChallengeCard } from "@/components/auth/mfa-challenge-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/use-translation";
import apiClient from "@/lib/api-client";
import { clearAuthSession, persistAuthSession } from "@/lib/auth-session";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import {
  createLoginSchema,
  formatAuthApiError,
  type LoginFormValues,
} from "@/lib/validations/auth";
import {
  ensureSupabaseAuthSession,
  needsMfaChallenge,
} from "@/lib/supabase-mfa";

type LoginTokens = {
  access_token: string;
  refresh_token?: string | null;
  user?: unknown;
};

type OtpPending = {
  userId: string;
  email: string;
  password: string;
};

export default function LoginPage() {
  const { t, locale } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [otpPending, setOtpPending] = useState<OtpPending | null>(null);
  const schema = useMemo(() => createLoginSchema(locale), [locale]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
  });

  async function finishLoginRedirect() {
    let href = "/";
    try {
      const redirect = await resolvePostLoginRedirect();
      href =
        !redirect.href ||
        redirect.href === "/login" ||
        redirect.href.startsWith("/login?")
          ? "/"
          : redirect.href;

      if (redirect.workspaceId) {
        writeActiveWorkspaceId(redirect.workspaceId);
        try {
          await setActiveWorkspaceCookie(redirect.workspaceId);
        } catch (cookieError) {
          console.warn("[login] setActiveWorkspaceCookie:", cookieError);
        }
      }
    } catch (redirectError) {
      console.error("[login] post-login redirect:", redirectError);
      href = "/";
    }

    toast.success(t("auth.success"));
    window.location.assign(href);
  }

  async function afterAuthenticated(tokens: LoginTokens) {
    try {
      await persistAuthSession(
        tokens.access_token,
        tokens.user,
        tokens.refresh_token,
      );
      await ensureSupabaseAuthSession();

      if (await needsMfaChallenge()) {
        setOtpPending(null);
        setMfaPending(true);
        setIsSubmitting(false);
        return;
      }

      // MFA/istemci yan etkileri cookie'yi bozmuş olabilir — yönlendirmeden önce yenile
      await persistAuthSession(
        tokens.access_token,
        tokens.user,
        tokens.refresh_token,
      );
    } catch (persistError) {
      console.error("[login] persist/MFA check:", persistError);
      toast.error(
        persistError instanceof Error
          ? persistError.message
          : t("auth.badCredentials"),
      );
      setIsSubmitting(false);
      return;
    }

    await finishLoginRedirect();
  }

  async function handleOtpVerified(tokens: EmailOtpTokens) {
    await afterAuthenticated({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      user: tokens.user,
    });
  }

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    const email = values.email.trim().toLowerCase();
    let tokens: LoginTokens;
    try {
      const { data } = await apiClient.post<{
        access_token?: string;
        refresh_token?: string;
        user?: unknown;
        otp_required?: boolean;
        user_id?: string;
      }>("/auth/login", {
        email,
        password: values.password,
      });

      if (data.otp_required && data.user_id) {
        setOtpPending({
          userId: data.user_id,
          email,
          password: values.password,
        });
        setIsSubmitting(false);
        return;
      }

      if (!data.access_token) {
        toast.error(t("auth.tokenMissing"));
        setIsSubmitting(false);
        return;
      }

      tokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        user: data.user,
      };
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ?? t("auth.badCredentials"))
        : t("auth.badCredentials");

      toast.error(
        formatAuthApiError(message, t("auth.badCredentials"), locale),
      );
      setIsSubmitting(false);
      return;
    }

    await afterAuthenticated(tokens);
  };

  if (mfaPending) {
    return (
      <AuthSplitShell>
        <MfaChallengeCard
          onVerified={() => finishLoginRedirect()}
          onCancel={async () => {
            await clearAuthSession();
            setMfaPending(false);
          }}
        />
      </AuthSplitShell>
    );
  }

  if (otpPending) {
    return (
      <AuthSplitShell>
        <EmailOtpChallengeCard
          email={otpPending.email}
          password={otpPending.password}
          userId={otpPending.userId}
          onVerified={handleOtpVerified}
          onCancel={async () => {
            await clearAuthSession();
            setOtpPending(null);
          }}
        />
      </AuthSplitShell>
    );
  }

  return (
    <AuthSplitShell>
      <Card className="rounded-[var(--radius)] border border-zinc-800 bg-zinc-900 text-zinc-50 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-zinc-50">
            {t("auth.loginTitle")}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {t("auth.loginSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-200">
                {t("auth.email")}
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t("auth.emailPlaceholder")}
                className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-red-400">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-zinc-200">
                  {t("auth.password")}
                </Label>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  {t("auth.forgotPassword")}
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-red-400">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? t("auth.submitting") : t("auth.submit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-zinc-400">
            {t("auth.noAccount")}{" "}
            <Link
              href="/register"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t("auth.registerLink")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthSplitShell>
  );
}
