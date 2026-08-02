"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { resolvePostLoginRedirect } from "@/app/actions/notifications";
import { AuthSplitShell } from "@/components/auth/auth-split-shell";
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
import { persistAuthSession } from "@/lib/auth-session";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import {
  createRegisterSchema,
  formatAuthApiError,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export default function RegisterPage() {
  const { t, locale } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => createRegisterSchema(locale), [locale]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setIsSubmitting(true);
    try {
      const email = values.email.trim().toLowerCase();
      const password = values.password;

      try {
        await apiClient.post("/auth/register", {
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email,
          password,
        });
      } catch (error) {
        const message = isAxiosError(error)
          ? (error.response?.data?.message ?? t("auth.registerFailed"))
          : t("auth.registerFailed");
        toast.error(
          formatAuthApiError(message, t("auth.registerFailed"), locale),
        );
        return;
      }

      let accessToken: string;
      let refreshToken: string | null | undefined;
      let user: unknown;
      try {
        const { data } = await apiClient.post<{
          access_token?: string;
          refresh_token?: string;
          user?: unknown;
        }>("/auth/login", { email, password });

        if (!data.access_token) {
          toast.success(t("auth.registerSuccessLogin"));
          window.location.assign("/login");
          return;
        }
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        user = data.user;
      } catch (error) {
        const message = isAxiosError(error)
          ? (error.response?.data?.message ?? t("auth.registerSuccessLogin"))
          : t("auth.registerSuccessLogin");
        toast.error(
          formatAuthApiError(message, t("auth.registerSuccessLogin"), locale),
        );
        window.location.assign("/login");
        return;
      }

      try {
        await persistAuthSession(accessToken, user, refreshToken);
      } catch (persistError) {
        console.error("[register] persistAuthSession:", persistError);
      }

      let href = "/onboarding";
      try {
        const redirect = await resolvePostLoginRedirect();
        href =
          !redirect.href ||
          redirect.href === "/login" ||
          redirect.href.startsWith("/login?")
            ? "/onboarding"
            : redirect.href;
        if (redirect.workspaceId) {
          writeActiveWorkspaceId(redirect.workspaceId);
        }
      } catch (redirectError) {
        console.error("[register] post-login redirect:", redirectError);
        href = "/onboarding";
      }

      toast.success(t("auth.registerSuccessLogin"));
      window.location.assign(href);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitShell>
      <Card className="rounded-[var(--radius)] border border-zinc-800 bg-zinc-900 text-zinc-50 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-zinc-50">
            {t("auth.registerTitle")}
          </CardTitle>
          <CardDescription className="text-zinc-400">
            {t("auth.registerSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-zinc-200">
                  {t("auth.firstName")}
                </Label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder={t("auth.firstNamePlaceholder")}
                  className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
                {errors.firstName ? (
                  <p className="text-sm text-red-400">
                    {errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-zinc-200">
                  {t("auth.lastName")}
                </Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder={t("auth.lastNamePlaceholder")}
                  className="rounded-[var(--radius)] border-zinc-800 bg-zinc-950 text-zinc-50 placeholder:text-zinc-500"
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
                {errors.lastName ? (
                  <p className="text-sm text-red-400">
                    {errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>
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
              <Label htmlFor="password" className="text-zinc-200">
                {t("auth.password")}
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder={t("auth.passwordMin")}
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
              {isSubmitting
                ? t("auth.registerSubmitting")
                : t("auth.registerSubmit")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-zinc-400">
            {t("auth.haveAccount")}{" "}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              {t("auth.loginLink")}
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthSplitShell>
  );
}
