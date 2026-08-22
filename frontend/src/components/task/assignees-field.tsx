"use client";

import { cleanText, emailLocalPart } from "@/lib/member-labels";
import type { WorkspaceMemberOption } from "@/lib/member-labels";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/i18n/use-translation";
import { cn } from "@/lib/utils";

type AssigneesFieldProps = {
  id?: string;
  label: string;
  members: WorkspaceMemberOption[];
  /** Sıralı liste: ilk id birincil atanan (assignee_id), geri kalanı ek atanan (task_assignees). */
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  /** false ise en fazla 1 kişi seçilebilir (radio davranışı) — çoklu seçim admin'e özel kalır. */
  canMultiSelect: boolean;
  disabled?: boolean;
  hint?: string;
};

/**
 * Görev oluşturma VE görev detayında kullanılan tek "Atanan Kişiler"
 * bileşeni. Önceden ikisi de birincil (tekli `assignee_id`) ile ek
 * atananları (çoklu `task_assignees`) iki ayrı, tekrarlanan widget olarak
 * gösteriyordu. Burada tek bir çoklu-seçim listesi var; seçim sırasındaki
 * İLK kişi otomatik olarak birincil atanan sayılır (üstünde rozet
 * görünür). Admin olmayan kullanıcılar için `canMultiSelect=false`
 * geçilir — bileşen aynı kalır, yalnızca ikinci bir kişi seçildiğinde
 * öncekinin yerine geçer (radyo davranışı).
 */
export function AssigneesField({
  id = "task-assignees",
  label,
  members,
  selectedIds,
  onChange,
  canMultiSelect,
  disabled = false,
  hint,
}: AssigneesFieldProps) {
  const { t } = useTranslation();

  function toggle(memberId: string) {
    if (disabled) return;
    const isChecked = selectedIds.includes(memberId);
    if (isChecked) {
      onChange(selectedIds.filter((v) => v !== memberId));
      return;
    }
    onChange(canMultiSelect ? [...selectedIds, memberId] : [memberId]);
  }

  const primaryId = selectedIds[0] ?? null;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
        {canMultiSelect ? ` (${selectedIds.length})` : ""}
      </Label>
      <div
        id={id}
        role="group"
        className={cn(
          "max-h-36 space-y-1 overflow-y-auto rounded-lg border-2 border-border p-2 dark:border",
          disabled && "opacity-60",
        )}
      >
        {members.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            {t("taskModal.noMembers")}
          </p>
        ) : (
          members.map((member) => {
            const memberLabel =
              cleanText(member.fullName) ||
              cleanText(member.displayName) ||
              emailLocalPart(member.email) ||
              cleanText(member.email) ||
              "";
            if (!memberLabel) return null;
            const checked = selectedIds.includes(member.id);
            const isPrimary = checked && member.id === primaryId;
            return (
              <label
                key={member.id}
                className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggle(member.id)}
                  className="size-3.5 rounded border-border accent-primary"
                />
                <span className="truncate text-foreground">
                  {memberLabel}
                  {isPrimary ? ` — ${t("taskModal.primary")}` : ""}
                </span>
              </label>
            );
          })
        )}
      </div>
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
