"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  removeWorkspaceMember,
  updateWorkspaceMemberRole,
} from "@/app/actions/admin-members";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/i18n/use-translation";
import { cn } from "@/lib/utils";

type MembersTableProps = {
  workspaceId: string;
  members: WorkspaceMemberOption[];
  isAdmin: boolean;
  currentUserId?: string | null;
};

export function MembersTable({
  workspaceId,
  members: initial,
  isAdmin,
  currentUserId,
}: MembersTableProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [members, setMembers] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) => {
      const hay = `${m.displayName} ${m.email ?? ""} ${m.role ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, query]);

  function onRoleChange(userId: string, role: "Admin" | "Member") {
    const previous = members.find((m) => m.id === userId)?.role ?? null;
    startTransition(async () => {
      const result = await updateWorkspaceMemberRole({
        workspaceId,
        userId,
        role,
      });
      if (!result.success) {
        // Sunucu reddetti — yerel state'i geri al ki UI gerçekle uyuşsun.
        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, role: previous } : m)),
        );
        toast.error(result.error);
        return;
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, role } : m)),
      );
      toast.success(result.message);
      // Sunucu tarafındaki listeyi de tazele (cache invalidation sonrası).
      router.refresh();
    });
  }

  function onRemove(userId: string) {
    if (!window.confirm(t("members.confirmRemove"))) return;
    startTransition(async () => {
      const result = await removeWorkspaceMember({ workspaceId, userId });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      setMembers((prev) => prev.filter((m) => m.id !== userId));
      toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("members.filterPlaceholder")}
          className="h-9 w-full max-w-sm rounded-md border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <p className="text-sm text-muted-foreground">
          {t("members.count", { n: String(filtered.length) })}
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">{t("members.colName")}</th>
              <th className="px-4 py-3 font-medium">{t("members.colEmail")}</th>
              <th className="px-4 py-3 font-medium">{t("members.colRole")}</th>
              {isAdmin ? (
                <th className="px-4 py-3 font-medium text-right">
                  {t("members.colActions")}
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={isAdmin ? 4 : 3}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("members.empty")}
                </td>
              </tr>
            ) : (
              filtered.map((member) => {
                const role = member.role ?? "Member";
                const isOwner = role.toUpperCase() === "OWNER";
                const isSelf = currentUserId === member.id;
                const canManage = isAdmin && !isOwner && !isSelf;

                return (
                  <tr
                    key={member.id}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="flex size-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                          {(member.displayName || "?").slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-medium text-foreground">
                          {member.displayName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {isAdmin && !isOwner && !isSelf ? (
                        <Select
                          value={
                            role === "Admin" || role.toUpperCase() === "ADMIN"
                              ? "Admin"
                              : "Member"
                          }
                          disabled={pending}
                          onValueChange={(v) =>
                            onRoleChange(member.id, v as "Admin" | "Member")
                          }
                        >
                          <SelectTrigger className="h-8 w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Member">Member</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant="secondary"
                          className={cn(
                            isOwner && "bg-amber-500/15 text-amber-700",
                          )}
                        >
                          {role}
                        </Badge>
                      )}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-right">
                        {canManage ? (
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={pending}
                            onClick={() => onRemove(member.id)}
                          >
                            {t("members.remove")}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
