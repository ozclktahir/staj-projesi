"use client";

import { Suspense, useState } from "react";
import { LogOut, Menu, UserRound } from "lucide-react";
import { toast } from "sonner";
import { InviteNotificationsMenu } from "@/components/invite-notifications-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/use-translation";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { clearAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

type AppHeaderProps = {
  userName?: string;
  userEmail?: string | null;
  isLoadingUser?: boolean;
  onOpenMobileNav?: () => void;
};

function UserNameSkeleton() {
  return (
    <div className="hidden min-w-0 space-y-1.5 sm:block" aria-hidden>
      <div className="h-3.5 w-28 animate-pulse rounded bg-muted" />
      <div className="h-2.5 w-20 animate-pulse rounded bg-muted/70" />
    </div>
  );
}

function AppHeaderInner({
  userName = "",
  userEmail = null,
  isLoadingUser = false,
  onOpenMobileNav,
}: AppHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { refresh } = useWorkspaces();
  const { t } = useTranslation();

  // DB'den gelen ad-soyad olduğu gibi; boşsa e-posta
  const displayName = userName.trim() || userEmail?.trim() || "";
  const secondary =
    userEmail &&
    displayName &&
    userEmail.toLowerCase() !== displayName.toLowerCase()
      ? userEmail
      : null;

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await clearAuthSession();
      toast.success(t("header.logoutSuccess"));
      window.location.assign("/login");
    } catch {
      toast.error(t("header.logoutError"));
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b-2 border-border bg-background/80 px-4 backdrop-blur sm:px-6 dark:border-b">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMobileNav ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={onOpenMobileNav}
            aria-label={t("header.openMenu")}
          >
            <Menu className="size-5" />
          </Button>
        ) : null}
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{t("header.overview")}</p>
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground">
            {t("header.workspace")}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <InviteNotificationsMenu
          onAccepted={() => {
            void refresh();
          }}
        />

        <div
          className="flex max-w-[240px] items-center gap-2 rounded-[var(--radius)] border-2 border-border bg-card px-2.5 py-1.5 shadow-sm dark:border dark:shadow-none"
          title={secondary ?? displayName}
        >
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary",
              isLoadingUser && "animate-pulse",
            )}
          >
            <UserRound className="size-4" />
          </span>
          {isLoadingUser ? (
            <UserNameSkeleton />
          ) : (
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-sm font-medium text-foreground">
                {displayName}
              </p>
              {secondary ? (
                <p className="truncate text-xs text-muted-foreground">
                  {secondary}
                </p>
              ) : null}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="rounded-[var(--radius)] gap-1.5"
          aria-label={t("header.logout")}
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">
            {isLoggingOut ? t("header.loggingOut") : t("header.logout")}
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
