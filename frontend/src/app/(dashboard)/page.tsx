"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  readStoredUser,
  resolveUserDisplayName,
} from "@/lib/auth-session";

const placeholderProjects = [
  {
    id: "1",
    name: "Ürün Lansmanı",
    description: "Web sitesi ve pazarlama görevleri",
    tasks: 12,
  },
  {
    id: "2",
    name: "Mobil Uygulama",
    description: "Flutter istemci geliştirme",
    tasks: 8,
  },
  {
    id: "3",
    name: "İç Operasyonlar",
    description: "Süreç ve dokümantasyon işleri",
    tasks: 5,
  },
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("Kullanıcı");

  useEffect(() => {
    setUserName(resolveUserDisplayName(readStoredUser()));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <Card className="overflow-hidden rounded-[var(--radius)] border-border bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
        <CardHeader className="gap-2">
          <CardDescription className="text-sm text-muted-foreground">
            Dashboard
          </CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
            Hoş geldin,{" "}
            <span className="text-primary">{userName}</span>
          </CardTitle>
          <p className="max-w-xl text-sm text-muted-foreground">
            Projelerini buradan yönet, ilerlemeyi takip et ve ekibinle
            senkron kal.
          </p>
        </CardHeader>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Projelerim
            </h2>
            <p className="text-sm text-muted-foreground">
              Aktif çalışma alanların ve projelerin
            </p>
          </div>
          <Button className="rounded-[var(--radius)] bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="size-4" />
            Yeni Proje
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {placeholderProjects.map((project) => (
            <Card
              key={project.id}
              className="rounded-[var(--radius)] border-border bg-card transition-colors hover:border-primary/40"
            >
              <CardHeader className="space-y-3">
                <div className="flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
                  <FolderKanban className="size-5" />
                </div>
                <CardTitle className="text-lg text-foreground">
                  {project.name}
                </CardTitle>
                <CardDescription>{project.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-primary">
                    {project.tasks}
                  </span>{" "}
                  görev
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
