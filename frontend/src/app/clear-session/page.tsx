"use client";

import { useEffect } from "react";
import { clearAuthSession } from "@/lib/auth-session";

/**
 * Bozuk cookie'leri temizlemek için: http://localhost:3001/clear-session
 */
export default function ClearSessionPage() {
  useEffect(() => {
    void (async () => {
      await clearAuthSession();
      window.location.replace("/login");
    })();
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center p-6 text-sm text-muted-foreground">
      Oturum temizleniyor…
    </main>
  );
}
