"use client";

import { Suspense, useState } from "react";
import { LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { InviteNotificationsMenu } from "@/components/invite-notifications-menu";
import { Button } from "@/components/ui/button";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { clearAuthSession } from "@/lib/auth-session";
import { isAdminRole } from "@/lib/rbac";

type AppHeaderProps = {
  userName?: string;
};

function AppHeaderInner({ userName = "" }: AppHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { activeWorkspace, activeWorkspaceId, refresh } = useWorkspaces();
  const canCreateProject = isAdminRole(activeWorkspace?.role);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await clearAuthSession();
      toast.success("Çıkış yapıldı");
      window.location.assign("/login");
    } catch {
      toast.error("Çıkış yapılamadı. Tekrar deneyin.");
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
      <div>
        <p className="text-sm text-muted-foreground">Genel bakış</p>
        <h1 className="text-base font-semibold tracking-tight text-foreground">
          Çalışma alanı
        </h1>
      </div>

      <div className="flex items-center gap-2">
        {canCreateProject ? (
          <CreateProjectModal
            triggerLabel="Yeni Proje"
            workspaceId={activeWorkspaceId}
            triggerClassName="hidden rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
          />
        ) : null}

        <InviteNotificationsMenu
          onAccepted={() => {
            void refresh();
          }}
        />

        <div className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-card px-2.5 py-1.5">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-primary">
            <UserRound className="size-4" />
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>
      <p className="text-xs text-muted-foreground">Profil</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-[var(--radius)] gap-1.5"
          aria-label="Çıkış yap"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">
            {isLoggingOut ? "Çıkılıyor…" : "Çıkış"}
          </span>
        </Button>
      </div>
    </header>
  );
}

export function AppHeader(props: AppHeaderProps) {
  return (
    <Suspense
      fallback={
        <header className="flex h-16 shrink-0 border-b border-border bg-background/80" />
      }
    >
      <AppHeaderInner {...props} />
    </Suspense>
  );
}
