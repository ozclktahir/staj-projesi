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
      window.location.assign("/login");
    } catch {
      toast.error("Çıkış yapılamadı. Tekrar deneyin.");
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white/80 px-6 backdrop-blur">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Overview
        </p>
        <h1 className="text-sm font-semibold tracking-tight text-slate-900">
          Workspace
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <CreateProjectModal
          triggerLabel="Yeni Proje"
          triggerClassName="hidden rounded-md bg-primary text-primary-foreground hover:bg-primary/90 sm:inline-flex"
        />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label="Bildirimler"
        >
          <Bell className="size-4" />
          <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
        </Button>

        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1">
          <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <UserRound className="size-3.5" />
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-medium text-slate-900">
              {userName}
            </p>
            <p className="text-[11px] text-slate-400">Profil</p>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="gap-1.5 rounded-md border-slate-200"
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
