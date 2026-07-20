"use client";

import { useState } from "react";
import { Bell, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Button } from "@/components/ui/button";
import { clearAuthSession } from "@/lib/auth-session";

type AppHeaderProps = {
  userName?: string;
};

export function AppHeader({ userName = "Kullanıcı" }: AppHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await clearAuthSession();
      toast.success("Çıkış yapıldı");
      // Hard navigate: proxy/cookie kalıntısıyla dashboard'a geri düşmeyi önler
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
        <CreateProjectModal
          triggerLabel="Yeni Proje"
          triggerClassName="hidden rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-[var(--radius)] text-muted-foreground hover:text-foreground"
          aria-label="Bildirimler"
        >
          <Bell className="size-5" />
          <span className="absolute right-2 top-2 size-2 rounded-full bg-primary" />
        </Button>

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
