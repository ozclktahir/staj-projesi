"use client";

import { Users } from "lucide-react";
import type { AdminMemberOverview } from "@/app/actions/admin-overview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTranslation } from "@/i18n/use-translation";

type AdminOverviewPanelProps = {
  members: AdminMemberOverview[];
};

export function AdminOverviewPanel({ members }: AdminOverviewPanelProps) {
  const { t } = useTranslation();

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          {t("adminOverview.title")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t("adminOverview.subtitle")}
        </p>
      </div>

      <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base text-foreground">
              {t("adminOverview.membersTitle")}
            </CardTitle>
            <CardDescription>
              {t("adminOverview.membersCount", { n: members.length })}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("adminOverview.empty")}
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">
                    {t("adminOverview.colMember")}
                  </th>
                  <th className="px-2 py-2 font-medium">
                    {t("adminOverview.colRole")}
                  </th>
                  <th className="px-2 py-2 font-medium">
                    {t("adminOverview.colProjects")}
                  </th>
                  <th className="px-2 py-2 font-medium">
                    {t("adminOverview.colInProgress")}
                  </th>
                  <th className="px-2 py-2 font-medium">
                    {t("adminOverview.colDone")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr
                    key={member.userId}
                    className="border-b border-border/60 last:border-0"
                  >
                    <td className="px-2 py-3">
                      <p className="font-medium text-foreground">
                        {member.displayName?.trim() ||
                          member.email?.split("@")[0] ||
                          member.email ||
                          "—"}
                      </p>
                      {member.email ? (
                        <p className="text-xs text-muted-foreground">
                          {member.email}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {member.role}
                    </td>
                    <td className="px-2 py-3 text-muted-foreground">
                      {member.projectNames.length > 0
                        ? member.projectNames.join(", ")
                        : "—"}
                    </td>
                    <td className="px-2 py-3 font-medium text-sky-400">
                      {member.tasksInProgress}
                    </td>
                    <td className="px-2 py-3 font-medium text-emerald-400">
                      {member.tasksDone}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
