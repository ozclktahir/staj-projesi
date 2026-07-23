"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  CheckSquare,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Settings,
  Star,
  Trash2,
  UserPlus,
} from "lucide-react";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import { DeleteWorkspaceModal } from "@/components/delete-workspace-modal";
import { InviteMemberModal } from "@/components/invite-member-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { isAdminRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/my-tasks", label: "My Tasks", icon: CheckSquare },
  { href: "/favorites", label: "Favorites", icon: Star },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function SidebarInner() {
  const pathname = usePathname();
  const {
    workspaces,
    activeWorkspace,
    activeWorkspaceId,
    loading,
    selectWorkspace,
    refresh,
    upsertWorkspace,
    afterWorkspaceDeleted,
  } = useWorkspaces();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const canInvite = isAdminRole(activeWorkspace?.role);

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r-2 border-border bg-card dark:border-r">
      <div className="border-b-2 border-border p-3 dark:border-b">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-lg border-2 border-border bg-background px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border dark:shadow-none"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {(activeWorkspace?.name ?? "İY").slice(0, 2).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {loading
                    ? "Yükleniyor…"
                    : (activeWorkspace?.name ?? "Workspace seç")}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeWorkspace?.role
                    ? `Rol: ${activeWorkspace.role}`
                    : "Çalışma alanı"}
                </p>
              </div>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
            {workspaces.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                Henüz workspace yok
              </DropdownMenuItem>
            ) : (
              workspaces.map((workspace) => {
                const isActive = workspace.id === activeWorkspaceId;
                return (
                  <DropdownMenuItem
                    key={workspace.id}
                    onSelect={() => {
                      if (workspace.id !== activeWorkspaceId) {
                        selectWorkspace(workspace.id);
                      }
                    }}
                    className={cn(
                      "cursor-pointer gap-2",
                      isActive &&
                        "bg-primary/10 font-medium text-primary focus:bg-primary/15 focus:text-primary",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-foreground">
                      {workspace.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate">
                      {workspace.name}
                    </span>
                    {workspace.role ? (
                      <span className="text-[10px] text-muted-foreground">
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
            {canInvite ? (
              <DropdownMenuItem
                className="cursor-pointer gap-2 text-primary focus:text-primary"
                onSelect={(event) => {
                  event.preventDefault();
                  setInviteOpen(true);
                }}
              >
                <UserPlus className="size-4" />
                Üye Davet Et
              </DropdownMenuItem>
            ) : null}
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
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
              disabled={!activeWorkspace || !canInvite}
              onSelect={(event) => {
                event.preventDefault();
                if (activeWorkspace && canInvite) setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Workspace&apos;i Sil
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
          const hrefWithWs = withWorkspaceQuery(href, activeWorkspaceId);

          return (
            <Link
              key={href}
              href={hrefWithWs}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t-2 border-border p-4 dark:border-t">
        <p className="text-xs text-muted-foreground">Workspace yönetimi</p>
      </div>

      <CreateWorkspaceModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(workspace) => {
          upsertWorkspace(workspace);
          void refresh();
        }}
      />

      <DeleteWorkspaceModal
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        workspace={
          activeWorkspace
            ? { id: activeWorkspace.id, name: activeWorkspace.name }
            : null
        }
        onDeleted={({ deletedId, nextWorkspaceId }) => {
          void afterWorkspaceDeleted(deletedId, nextWorkspaceId);
        }}
      />

      <InviteMemberModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        workspaceId={activeWorkspaceId}
        workspaceName={activeWorkspace?.name}
      />
    </aside>
  );
}

export function Sidebar() {
  return (
    <Suspense
      fallback={
        <aside className="flex h-full w-64 shrink-0 border-r border-border bg-card" />
      }
    >
      <SidebarInner />
    </Suspense>
  );
}

/** Geriye dönük alias */
export { Sidebar as AppSidebar };
