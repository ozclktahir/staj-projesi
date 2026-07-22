"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { resolvePostLoginRedirect } from "@/app/actions/notifications";
import { setActiveWorkspaceCookie } from "@/app/actions/set-active-workspace";
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
  loginSchema,
  formatAuthApiError,
  type LoginFormValues,
} from "@/lib/validations/auth";

type LoginTokens = {
  access_token: string;
  refresh_token?: string | null;
  user?: unknown;
};

export default function LoginPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsSubmitting(true);

    // ── 1) Sadece kimlik doğrulama (şifre/e-posta hatası yalnızca burada) ──
    let tokens: LoginTokens;
    try {
      const { data } = await apiClient.post<{
        access_token?: string;
        refresh_token?: string;
        user?: unknown;
      }>("/auth/login", {
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      if (!data.access_token) {
        toast.error("Giriş başarısız: access_token alınamadı.");
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
        ? (error.response?.data?.message ?? "E-posta veya şifre hatalı")
        : "E-posta veya şifre hatalı";

      toast.error(formatAuthApiError(message, "E-posta veya şifre hatalı"));
      setIsSubmitting(false);
      return;
    }

    // ── 2) Oturum kalıcılığı (auth başarılı sayılır) ──
    try {
      await persistAuthSession(
        tokens.access_token,
        tokens.user,
        tokens.refresh_token,
      );
    } catch (persistError) {
      console.error("[login] persistAuthSession:", persistError);
      // Token client'ta kısmen yazılmış olabilir; yönlendirmeyi yine dene
    }

    // ── 3) Workspace / profil yönlendirme — hata auth başarısızlığı değildir ──
    let href = "/";
    try {
      const redirect = await resolvePostLoginRedirect();
      // Cookie race: sunucu henüz oturumu görmezse /login dönmesin
      href =
        !redirect.href || redirect.href === "/login" || redirect.href.startsWith("/login?")
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

    toast.success("Giriş başarılı");
    window.location.assign(href);
  };

  return (
    <AuthSplitShell>
      <Card className="rounded-[var(--radius)] border border-neutral-800 shadow-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl text-neutral-800 dark:text-neutral-200">
            Giriş Yap
          </CardTitle>
          <CardDescription>
            Hesabınıza giriş yapmak için e-posta ve şifrenizi girin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Şifre</Label>
                <Link
                  href="#"
                  className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
                >
                  Şifremi Unuttum
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
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
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş Yap"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <p className="text-sm text-muted-foreground">
            Hesabın yok mu?{" "}
            <Link
              href="/register"
              className="font-medium text-primary transition-colors hover:text-primary/80"
            >
              Kayıt Ol
            </Link>
          </p>
        </CardFooter>
      </Card>
    </AuthSplitShell>
  );
}
