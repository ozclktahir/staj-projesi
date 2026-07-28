"use client";

import { Suspense, useState, type ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  ChevronsUpDown,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Settings,
  Trash2,
  UserPlus,
} from "lucide-react";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";
import { DeleteWorkspaceModal } from "@/components/delete-workspace-modal";
import { InviteMemberModal } from "@/components/invite-member-modal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "@/i18n/use-translation";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { isAdminRole } from "@/lib/rbac";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", labelKey: "nav.dashboard", icon: LayoutDashboard },
  { href: "/projects", labelKey: "nav.projects", icon: FolderKanban },
  { href: "/personal", labelKey: "nav.personal", icon: NotebookPen },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

type SidebarProps = {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
};

function NavLinkItem({
  href,
  label,
  icon: Icon,
  isActive,
  collapsed,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "flex items-center rounded-lg py-2.5 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "gap-3 px-3",
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
      <span className={cn(collapsed && "hidden")}>{label}</span>
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function SidebarInner({
  collapsed,
  onCollapsedChange,
  showCollapseToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  showCollapseToggle: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const { t } = useTranslation();
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
  const workspaceInitials = (activeWorkspace?.name ?? "İY")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border p-3",
          collapsed ? "flex-col" : "justify-between",
        )}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex items-center rounded-lg border border-border bg-background text-left shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                collapsed
                  ? "size-10 justify-center p-0"
                  : "w-full min-w-0 flex-1 gap-2 px-3 py-2.5",
              )}
              aria-label={t("sidebar.selectWorkspace")}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
                {workspaceInitials}
              </span>
              <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
                <p className="truncate text-sm font-semibold text-foreground">
                  {loading
                    ? t("sidebar.loading")
                    : (activeWorkspace?.name ?? t("sidebar.selectWorkspace"))}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {activeWorkspace?.role
                    ? `${t("sidebar.role")}: ${activeWorkspace.role}`
                    : t("sidebar.workspaceArea")}
                </p>
              </div>
              <ChevronsUpDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground",
                  collapsed && "hidden",
                )}
              />
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>{t("sidebar.workspaces")}</DropdownMenuLabel>
            {workspaces.length === 0 ? (
              <DropdownMenuItem disabled className="text-muted-foreground">
                {t("sidebar.noWorkspaces")}
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
                {t("sidebar.inviteMember")}
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
              {t("sidebar.createWorkspace")}
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
              {t("sidebar.deleteWorkspace")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {showCollapseToggle ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onCollapsedChange(!collapsed)}
                aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
              >
                {collapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      <nav
        className={cn(
          "flex flex-1 flex-col gap-1 overflow-y-auto p-3",
          collapsed && "items-stretch",
        )}
      >
        {navItems.map(({ href, labelKey, icon }) => {
          const isActive =
            href === "/"
              ? pathname === "/"
              : pathname === href || pathname.startsWith(`${href}/`);
          const hrefWithWs = withWorkspaceQuery(href, activeWorkspaceId);
          const label = t(labelKey);

          return (
            <NavLinkItem
              key={href}
              href={hrefWithWs}
              label={label}
              icon={icon}
              isActive={isActive}
              collapsed={collapsed}
              onNavigate={onNavigate}
            />
          );
        })}
      </nav>

      <div
        className={cn(
          "border-t border-border p-4",
          collapsed && "flex justify-center px-2",
        )}
      >
        <p
          className={cn(
            "text-xs text-muted-foreground",
            collapsed && "hidden",
          )}
        >
          {t("sidebar.management")}
        </p>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex size-8 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground">
                WS
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">{t("sidebar.management")}</TooltipContent>
          </Tooltip>
        ) : null}
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
    </>
  );
}

function SidebarDesktop({
  collapsed,
  onCollapsedChange,
}: {
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  return (
    <aside
      className={cn(
        "sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-border bg-card transition-all duration-300 ease-in-out md:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <SidebarInner
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
        showCollapseToggle
      />
    </aside>
  );
}

function SidebarMobile({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-72 max-w-[85vw] p-0 sm:max-w-xs">
        <SheetHeader className="sr-only">
          <SheetTitle>{t("sidebar.navigation")}</SheetTitle>
          <SheetDescription>{t("sidebar.navigationDesc")}</SheetDescription>
        </SheetHeader>
        <div className="flex h-full flex-col bg-card">
          <SidebarInner
            collapsed={false}
            onCollapsedChange={() => undefined}
            showCollapseToggle={false}
            onNavigate={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SidebarRoot({
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: SidebarProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <SidebarDesktop
        collapsed={collapsed}
        onCollapsedChange={onCollapsedChange}
      />
      <SidebarMobile open={mobileOpen} onOpenChange={onMobileOpenChange} />
    </TooltipProvider>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <Suspense
      fallback={
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-border bg-card md:flex",
            props.collapsed ? "w-16" : "w-64",
          )}
        />
      }
    >
      <SidebarRoot {...props} />
    </Suspense>
  );
}

/** Geriye dönük alias */
export { Sidebar as AppSidebar };
