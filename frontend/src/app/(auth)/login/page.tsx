"use client";

import Link from "next/link";
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

export default function LoginPage() {
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
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="ornek@email.com"
                required
                className="rounded-[var(--radius)]"
              />
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
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                className="rounded-[var(--radius)]"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Giriş Yap
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
