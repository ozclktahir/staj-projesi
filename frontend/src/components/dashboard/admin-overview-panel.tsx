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

type AdminOverviewPanelProps = {
  members: AdminMemberOverview[];
};

export function AdminOverviewPanel({ members }: AdminOverviewPanelProps) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Ekip ve Proje Durumu Takip
        </h2>
        <p className="text-sm text-muted-foreground">
          Admin görünümü — üyeler, projeler ve görev durumları
        </p>
      </div>

      <Card className="rounded-[var(--radius)] border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <Users className="size-5" />
          </span>
          <div>
            <CardTitle className="text-base text-foreground">
              Workspace Üyeleri
            </CardTitle>
            <CardDescription>
              {members.length} üye listeleniyor
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Henüz üye kaydı yok.
            </p>
          ) : (
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2 font-medium">Üye</th>
                  <th className="px-2 py-2 font-medium">Rol</th>
                  <th className="px-2 py-2 font-medium">Projeler</th>
                  <th className="px-2 py-2 font-medium">Devam</th>
                  <th className="px-2 py-2 font-medium">Tamamlanan</th>
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
                        {member.displayName}
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
