"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { isAxiosError } from "axios";
import { toast } from "sonner";
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
import {
  registerSchema,
  type RegisterFormValues,
} from "@/lib/validations/auth";

export default function RegisterPage() {
  const router = useRouter();
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
      await apiClient.post("/auth/register", {
        firstName: values.firstName,
        lastName: values.lastName,
        email: values.email,
        password: values.password,
      });

      toast.success("Kayıt başarılı. Giriş yapabilirsiniz.");
      router.push("/login");
    } catch (error) {
      const message = isAxiosError(error)
        ? (error.response?.data?.message ?? "Kayıt işlemi başarısız oldu")
        : "Kayıt işlemi başarısız oldu";

      toast.error(
        Array.isArray(message) ? message.join(", ") : String(message),
      );
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
