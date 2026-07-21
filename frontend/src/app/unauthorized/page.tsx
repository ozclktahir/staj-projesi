"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearAuthSession } from "@/lib/auth-session";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function UnauthorizedPage() {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const onSignOut = async () => {
    setSigningOut(true);
    try {
      await clearAuthSession();
      router.replace("/login");
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
      <Card className="w-full max-w-lg rounded-lg border-border bg-card shadow-sm">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl text-foreground">
            Erişim Yetkiniz Bulunmamaktadır
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Davet Bekleniyor
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Bu sisteme erişim davet ile sağlanmaktadır. Lütfen
            yöneticinizden bir davet isteyin.
          </p>
          <Button
            type="button"
            variant="outline"
            disabled={signingOut}
            onClick={() => void onSignOut()}
            className="rounded-lg"
          >
            {signingOut ? "Çıkış yapılıyor…" : "Çıkış Yap"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
