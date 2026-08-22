"use client";

import { Suspense, useEffect, useState } from "react";
import { getCurrentUserDisplayLabel } from "@/app/actions/current-user";
import { AppHeader } from "@/components/dashboard/app-header";
import { AuthTokenRefreshProvider } from "@/components/auth-token-refresh-provider";
import { Sidebar } from "@/components/sidebar";
import { WorkspacePresenceProvider } from "@/components/workspace-presence-provider";
import { syncAuthCookiesFromStorage } from "@/lib/auth-session";

export function DashboardShell({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
    // Presence sağlayıcısı shell seviyesinde: kullanıcı dashboard'da olmasa da
    // (projeler, kişisel alan, ayarlar…) çevrimiçi olarak görünür.
    // useWorkspaces → useSearchParams kullandığı için Suspense sınırı gerekli.
    <Suspense fallback={null}>
      <AuthTokenRefreshProvider />
      <WorkspacePresenceProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <Sidebar
            collapsed={isSidebarCollapsed}
            onCollapsedChange={setIsSidebarCollapsed}
            mobileOpen={isMobileNavOpen}
            onMobileOpenChange={setIsMobileNavOpen}
          />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader
              userName={userName}
              userEmail={userEmail}
              isLoadingUser={isLoadingUser}
              onOpenMobileNav={() => setIsMobileNavOpen(true)}
            />
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
              {children}
            </main>
          </div>
        </div>
      </WorkspacePresenceProvider>
    </Suspense>
  );
}
