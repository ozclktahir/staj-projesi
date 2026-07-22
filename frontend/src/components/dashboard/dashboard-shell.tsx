"use client";

import { useEffect, useState } from "react";
import { getCurrentUserDisplayLabel } from "@/app/actions/current-user";
import { AppHeader } from "@/components/dashboard/app-header";
import { Sidebar } from "@/components/sidebar";
import {
  readStoredUser,
  resolveUserDisplayName,
  syncAuthCookiesFromStorage,
} from "@/lib/auth-session";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await syncAuthCookiesFromStorage();

      // Hızlı ilk boyama: localStorage metadata
      const stored = readStoredUser();
      const quick = resolveUserDisplayName(stored);
      if (quick) {
        setUserName(quick);
        setUserEmail(stored?.email ?? null);
      }

      // Gerçek profil (full_name) ile güncelle
      const result = await getCurrentUserDisplayLabel();
      if (result.displayName) {
        setUserName(result.displayName);
      }
      if (result.email) {
        setUserEmail(result.email);
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader userName={userName} userEmail={userEmail} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
