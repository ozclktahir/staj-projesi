"use client";

import Link from "next/link";
import { useState } from "react";
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
import apiClient from "@/lib/api-client";
import { persistAuthSession } from "@/lib/auth-session";
import { writeActiveWorkspaceId } from "@/hooks/use-workspaces";
import {
  formatAuthApiError,
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export default function RegisterPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
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
          ? (error.response?.data?.message ?? "Kayıt işlemi başarısız oldu")
          : "Kayıt işlemi başarısız oldu";
        toast.error(formatAuthApiError(message, "Kayıt işlemi başarısız oldu"));
        return;
      }

      // Anlık oturum: kayıt sonrası otomatik giriş
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
          toast.success("Kayıt başarılı. Giriş yapabilirsiniz.");
          window.location.assign("/login");
          return;
        }
        accessToken = data.access_token;
        refreshToken = data.refresh_token;
        user = data.user;
      } catch (error) {
        const message = isAxiosError(error)
          ? (error.response?.data?.message ?? "Kayıt başarılı; otomatik giriş başarısız")
          : "Kayıt başarılı; otomatik giriş başarısız";
        toast.error(formatAuthApiError(message, "Kayıt başarılı; lütfen giriş yapın."));
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

      toast.success("Kayıt başarılı — çalışma alanına yönlendiriliyorsun");
      window.location.assign(href);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitShell>
      <Card className="rounded-[var(--radius)] border border-neutral-800 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-neutral-800 dark:text-neutral-200">
            Kayıt Ol
          </CardTitle>
          <CardDescription>
            Yeni bir hesap oluşturmak için bilgilerini doldur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Adınız"
                  className="rounded-[var(--radius)]"
                  aria-invalid={Boolean(errors.firstName)}
                  {...register("firstName")}
                />
                {errors.firstName ? (
                  <p className="text-sm text-red-500">
                    {errors.firstName.message}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Soyadınız"
                  className="rounded-[var(--radius)]"
                  aria-invalid={Boolean(errors.lastName)}
                  {...register("lastName")}
                />
                {errors.lastName ? (
                  <p className="text-sm text-red-500">
                    {errors.lastName.message}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="ornek@email.com"
                className="rounded-[var(--radius)]"
                aria-invalid={Boolean(errors.email)}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="En az 6 karakter"
                className="rounded-[var(--radius)]"
                aria-invalid={Boolean(errors.password)}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-red-500">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isSubmitting ? "Kayıt yapılıyor..." : "Kayıt Ol"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Zaten hesabın var mı?{" "}
            <Link
              href="/login"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Giriş Yap
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthSplitShell>
  );
}
