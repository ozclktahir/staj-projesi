"use client";

import { useEffect, useState } from "react";
import { getCurrentUserDisplayLabel } from "@/app/actions/current-user";
import { AppHeader } from "@/components/dashboard/app-header";
import { Sidebar } from "@/components/sidebar";
import {
  readStoredUser,
  syncAuthCookiesFromStorage,
} from "@/lib/auth-session";
import { resolveUiDisplayName } from "@/lib/member-labels";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userName, setUserName] = useState("Kullanıcı Yükleniyor...");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setIsLoadingUser(true);
      try {
        await syncAuthCookiesFromStorage();

        const stored = readStoredUser();
        const quick = resolveUiDisplayName({
          metadataFullName: stored?.user_metadata?.full_name,
          firstName: stored?.user_metadata?.first_name,
          lastName: stored?.user_metadata?.last_name,
          email: stored?.email,
          loading: true,
        });

        if (!cancelled) {
          setUserName(quick);
          setUserEmail(stored?.email ?? null);
          console.info("[DashboardShell] stored user label", {
            quick,
            email: stored?.email ?? null,
            meta: stored?.user_metadata ?? null,
          });
        }

        const result = await getCurrentUserDisplayLabel();
        if (cancelled) return;

        const nextName = resolveUiDisplayName({
          metadataFullName: stored?.user_metadata?.full_name,
          profileFullName: result.displayName,
          firstName: stored?.user_metadata?.first_name,
          lastName: stored?.user_metadata?.last_name,
          email: result.email ?? stored?.email,
          loading: false,
        });

        console.info("[DashboardShell] server user label", {
          nextName,
          serverDisplayName: result.displayName,
          email: result.email,
        });

        setUserName(nextName);
        setUserEmail(result.email ?? stored?.email ?? null);
      } catch (error) {
        console.error("[DashboardShell] user label load failed:", error);
        if (!cancelled) {
          const stored = readStoredUser();
          setUserName(
            resolveUiDisplayName({
              metadataFullName: stored?.user_metadata?.full_name,
              email: stored?.email,
              loading: false,
            }),
          );
        }
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
