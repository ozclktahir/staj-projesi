"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Filter } from "lucide-react";
import type { UpcomingDeadlineItem } from "@/types/personal-workspace";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n/use-translation";
import {
  localizedPriority,
  localizedStatus,
} from "@/lib/localized-labels";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type KindFilter = "all" | "task" | "subtask" | "todo";
type PriorityFilter = "all" | TaskPriority;

function formatDue(iso: string, locale: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString(locale === "en" ? "en-US" : "tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntilLabel(
  iso: string,
  t: (key: string, vars?: Record<string, string | number>) => string,
): string {
  const due = new Date(iso).getTime();
  if (Number.isNaN(due)) return "";
  const diff = Math.ceil((due - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return t("deadlines.today");
  if (diff === 1) return t("deadlines.tomorrow");
  if (diff < 0) return t("deadlines.daysOverdue", { n: Math.abs(diff) });
  return t("deadlines.daysLeft", { n: diff });
}

function kindLabel(
  kind: UpcomingDeadlineItem["kind"],
  t: (key: string) => string,
): string {
  if (kind === "task") return t("deadlines.typeTask");
  if (kind === "subtask") return t("deadlines.typeSubtask");
  return t("deadlines.typeTodo");
}

function taskHref(item: UpcomingDeadlineItem): string | null {
  if (!item.projectId) return null;
  if (item.kind === "todo") return null;
  const taskId =
    item.kind === "subtask" && item.parentTaskId
      ? item.parentTaskId
      : item.id;
  return `/project/${item.projectId}?taskId=${encodeURIComponent(taskId)}`;
}

export function UpcomingDeadlines({ items }: { items: UpcomingDeadlineItem[] }) {
  const router = useRouter();
  const { t, locale } = useTranslation();
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [hideCompleted, setHideCompleted] = useState(true);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (hideCompleted && item.completed) return false;
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (
        priorityFilter !== "all" &&
        item.priority &&
        item.priority !== priorityFilter
      ) {
        return false;
      }
      if (priorityFilter !== "all" && !item.priority) return false;
      return true;
    });
  }, [items, kindFilter, priorityFilter, hideCompleted]);

  return (
    <Card className="rounded-lg border-border shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              {t("deadlines.title")}
            </CardTitle>
            <CardDescription>{t("deadlines.description")}</CardDescription>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Filter className="size-3.5" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("deadlines.filterAll")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={kindFilter}
                onValueChange={(v) => setKindFilter(v as KindFilter)}
              >
                <DropdownMenuRadioItem value="all">
                  {t("deadlines.filterAll")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="task">
                  {t("deadlines.filterTasks")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="subtask">
                  {t("deadlines.filterSubtasks")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="todo">
                  {t("deadlines.filterTodos")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t("deadlines.filterPriority")}</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={priorityFilter}
                onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
              >
                <DropdownMenuRadioItem value="all">
                  {t("deadlines.filterPriorityAll")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="HIGH">
                  {localizedPriority(t, "HIGH")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="MEDIUM">
                  {localizedPriority(t, "MEDIUM")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="LOW">
                  {localizedPriority(t, "LOW")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={hideCompleted}
                onCheckedChange={(checked) =>
                  setHideCompleted(Boolean(checked))
                }
              >
                {hideCompleted
                  ? t("deadlines.hideCompleted")
                  : t("deadlines.showCompleted")}
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            {t("deadlines.empty")}
          </p>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filtered.slice(0, 12).map((item) => {
              const href = taskHref(item);

              const handleNavigate = () => {
                if (!href) return;
                router.push(href);
              };

              return (
                <AccordionItem
                  key={`${item.kind}-${item.id}`}
                  value={`${item.kind}-${item.id}`}
                  className="border-b border-border last:border-b-0"
                >
                  <div className="flex items-start gap-1">
                    <div
                      role={href ? "link" : undefined}
                      tabIndex={href ? 0 : undefined}
                      onClick={href ? handleNavigate : undefined}
                      onKeyDown={
                        href
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                handleNavigate();
                              }
                            }
                          : undefined
                      }
                      className={cn(
                        "flex min-w-0 flex-1 items-start justify-between gap-2 rounded-md p-3 transition-colors",
                        href &&
                          "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      )}
                    >
                      <div className="min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">
                            {kindLabel(item.kind, t)}
                          </Badge>
                          {item.priority ? (
                            <Badge variant="secondary" className="text-[10px]">
                              {localizedPriority(t, item.priority)}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-foreground">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.projectName
                            ? `${item.projectName} · `
                            : item.parentTaskTitle
                              ? `${item.parentTaskTitle} · `
                              : ""}
                          {item.status === "OPEN" || item.status === "DONE"
                            ? item.completed
                              ? t("common.statusDone")
                              : t("common.statusTodo")
                            : localizedStatus(t, item.status as TaskStatus)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-foreground">
                          {formatDue(item.dueDate, locale)}
                        </p>
                        <p
                          className={cn(
                            "text-[11px]",
                            item.completed
                              ? "text-muted-foreground"
                              : "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {daysUntilLabel(item.dueDate, t)}
                        </p>
                      </div>
                    </div>

                    <div
                      className="shrink-0 pt-2"
                      onClick={(event: MouseEvent) => {
                        event.stopPropagation();
                      }}
                    >
                      <AccordionTrigger
                        aria-label={t("deadlines.subtasks")}
                        className="size-9 items-center justify-center rounded-md p-0 hover:bg-muted hover:no-underline [&[data-state=open]>svg]:rotate-180"
                      />
                    </div>
                  </div>

                  <AccordionContent>
                    {item.kind === "task" ? (
                      item.subtasks.length === 0 ? (
                        <p className="px-3 text-xs text-muted-foreground">
                          {t("deadlines.noSubtasks")}
                        </p>
                      ) : (
                        <ul className="mx-3 space-y-1.5 rounded-md border border-border bg-muted/30 p-2">
                          <li className="px-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {t("deadlines.subtasks")}
                          </li>
                          {item.subtasks.map((sub) => (
                            <li
                              key={sub.id}
                              className="flex items-center justify-between gap-2 rounded px-2 py-1.5 text-sm"
                            >
                              <span
                                className={cn(
                                  "truncate",
                                  sub.completed &&
                                    "text-muted-foreground line-through",
                                )}
                              >
                                {sub.title}
                              </span>
                              <Badge variant="outline" className="text-[10px]">
                                {localizedStatus(t, sub.status as TaskStatus)}
                              </Badge>
                            </li>
                          ))}
                        </ul>
                      )
                    ) : (
                      <p className="px-3 text-xs text-muted-foreground">
                        {item.kind === "subtask" && item.parentTaskTitle
                          ? item.parentTaskTitle
                          : kindLabel(item.kind, t)}
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
