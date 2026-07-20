"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Check,
  CheckSquare,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings,
  Star,
} from "lucide-react";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    loading,
    selectWorkspace,
    refresh,
    upsertWorkspace,
  } = useWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
      <div className="border-b border-slate-200 p-3 dark:border-slate-800">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {(activeWorkspace?.name ?? "İY").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {loading
                    ? "Yükleniyor…"
                    : (activeWorkspace?.name ?? "Workspace seç")}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {[
                    activeWorkspace?.role
                      ? `Rol: ${activeWorkspace.role}`
                      : null,
                    activeWorkspace?.owner_id ? "owner_id ✓" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Çalışma alanı"}
                </p>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="start"
            className="w-56 border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
          >
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.length === 0 ? (
              <DropdownMenuItem disabled className="text-slate-500">
                Henüz workspace yok
              </DropdownMenuItem>
            ) : (
              workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;
                return (
                  <DropdownMenuItem
                    key={workspace.id}
                    onSelect={() => {
                      selectWorkspace(workspace.id);
                      if (workspace.id !== activeWorkspaceId) {
                        router.refresh();
                      }
                    }}
                    className={cn(
                      "cursor-pointer gap-2",
                      isActive &&
                        "bg-primary/10 font-medium text-primary focus:bg-primary/15 focus:text-primary",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-slate-200 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {workspace.name}
                    </span>
                    {workspace.role ? (
                      <span className="text-[10px] text-slate-400">
                        {workspace.role}
                      </span>
                    ) : null}
                    {isActive ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-primary focus:text-primary"
              onSelect={(event) => {
                event.preventDefault();
                setCreateOpen(true);
              }}
            >
              <Plus className="size-4" />
              Create New Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-slate-100",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "text-slate-400",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Workspace yönetimi
        </p>
      </div>

      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(workspace) => {
          upsertWorkspace(workspace);
          void refresh().then(() => {
            router.refresh();
          });
        }}
      />
    </aside>
  );
}

/** Geriye dönük alias */
export { Sidebar as AppSidebar };
