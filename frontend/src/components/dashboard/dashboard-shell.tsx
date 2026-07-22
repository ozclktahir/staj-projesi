"use client";

import { useEffect, useState } from "react";
import { getCurrentUserDisplayLabel } from "@/app/actions/current-user";
import { AppHeader } from "@/components/dashboard/app-header";
import { Sidebar } from "@/components/sidebar";
import { syncAuthCookiesFromStorage } from "@/lib/auth-session";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoadingUser(true);
      try {
        await syncAuthCookiesFromStorage();

        // Veritabanından gerçek ad-soyad
        const result = await getCurrentUserDisplayLabel();
        if (cancelled) return;

        const name = result.displayName.trim();
        if (!name) {
          console.warn(
            "[DashboardShell] profiles'ta ad-soyad yok:",
            result,
          );
        }

        setUserName(name);
        setUserEmail(result.email);
      } catch (error) {
        console.error("[DashboardShell] profil okunamadı:", error);
      } finally {
        if (!cancelled) setIsLoadingUser(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader
          userName={userName}
          userEmail={userEmail}
          isLoadingUser={isLoadingUser}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
