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

export default function RegisterPage() {
  return (
    <AuthSplitShell>
      <Card className="rounded-[var(--radius)] border-border/80 shadow-sm">
        <CardHeader className="space-y-2">
          <CardTitle className="text-2xl">Kayıt Ol</CardTitle>
          <CardDescription>
            Yeni bir hesap oluşturmak için bilgilerini doldur.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">Ad</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  placeholder="Adınız"
                  required
                  className="rounded-[var(--radius)]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Soyad</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  placeholder="Soyadınız"
                  required
                  className="rounded-[var(--radius)]"
                />
              </div>
            </div>
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
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="En az 6 karakter"
                minLength={6}
                required
                className="rounded-[var(--radius)]"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Kayıt Ol
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
