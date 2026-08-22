"use client";

import { useCallback, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspacePresence } from "@/hooks/use-workspace-presence";
import {
  getCachedWorkspaceMembers,
  setCachedWorkspaceMembers,
} from "@/lib/client-cache";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import { useTranslation } from "@/i18n/use-translation";

type OnlineMembersPopoverProps = {
  workspaceId: string | null;
  /** Tetikleyici (stat kartı). `DropdownMenuTrigger asChild` ile sarılır. */
  children: ReactNode;
};

/**
 * Dashboard'daki "Aktif Üyeler" kartına tıklandığında şu anda çevrimiçi olan
 * kişileri (avatar + ad) listeleyen açılır menü.
 *
 * Presence kanalı yalnızca kullanıcı ID'si taşır; ad/avatar için üye listesi
 * gerekir — bu istek sayfa yüklemesinde DEĞİL, menü ilk açıldığında (lazily)
 * yapılır ve `client-cache`'teki paylaşılan üye önbelleğini kullanır (aynı
 * oturumda başka bir yerde zaten çekildiyse anında gösterir).
 */
export function OnlineMembersPopover({
  workspaceId,
  children,
}: OnlineMembersPopoverProps) {
  const { t } = useTranslation();
  const presence = useWorkspacePresence(workspaceId);
  const [open, setOpen] = useState(false);
  const [members, setMembers] = useState<WorkspaceMemberOption[] | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    if (!workspaceId) return;

    const cached = getCachedWorkspaceMembers(workspaceId);
    if (cached) {
      setMembers(cached.members);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await getWorkspaceMembers(workspaceId);
      if (result.success) {
        setMembers(result.members);
        setCachedWorkspaceMembers(workspaceId, {
          members: result.members,
          isAdmin: result.isAdmin,
        });
      } else {
        setError(result.error);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next && members === null && !loading) {
        void loadMembers();
      }
    },
    [loadMembers, members, loading],
  );

  const onlineMembers = (members ?? []).filter((member) =>
    presence.onlineUserIds.includes(member.id),
  );

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild disabled={!workspaceId}>
        {children}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[20rem] rounded-lg border-border bg-card p-0 shadow-lg"
      >
        <div className="px-3 py-2.5">
          <DropdownMenuLabel className="p-0 text-sm font-semibold">
            {t("analytics.onlineMembersTitle")}
          </DropdownMenuLabel>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {presence.ready
              ? t("analytics.onlineMembersCount", { n: onlineMembers.length })
              : t("analytics.onlineMembersNotReady")}
          </p>
        </div>
        <DropdownMenuSeparator />
        <div className="max-h-[20rem] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center gap-2 px-3 py-6 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("analytics.onlineMembersLoading")}
            </div>
          ) : error ? (
            <p className="px-3 py-6 text-center text-xs text-destructive">
              {error || t("analytics.onlineMembersError")}
            </p>
          ) : onlineMembers.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("analytics.onlineMembersEmpty")}
            </p>
          ) : (
            <ul className="space-y-1">
              {onlineMembers.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5"
                >
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName}
                      className="size-7 shrink-0 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                      {(member.displayName || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-foreground">
                      {member.displayName}
                    </p>
                    {member.email ? (
                      <p className="truncate text-[10px] text-muted-foreground">
                        {member.email}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className="size-2 shrink-0 rounded-full bg-emerald-500"
                    aria-hidden="true"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
