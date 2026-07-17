"use client";

import { Bell, UserRound } from "lucide-react";
import { CreateProjectModal } from "@/components/CreateProjectModal";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  userName?: string;
};

export function AppHeader({ userName = "Kullanıcı" }: AppHeaderProps) {
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
      </div>
    </header>
  );
}
