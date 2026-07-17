import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListTodo } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProjectById } from "@/lib/supabase/server";

type ProjectDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ProjectDetailPage({
  params,
}: ProjectDetailPageProps) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-3">
          <Button
            asChild
            variant="ghost"
            className="h-auto rounded-[var(--radius)] px-0 text-muted-foreground hover:bg-transparent hover:text-primary"
          >
            <Link href="/">
              <ArrowLeft className="size-4" />
              Projelere dön
            </Link>
          </Button>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Proje detayı</p>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {project.name}
            </h1>
            <p className="max-w-2xl text-sm text-muted-foreground">
              {project.description?.trim()
                ? project.description
                : "Bu proje için henüz bir açıklama eklenmemiş."}
            </p>
            {project.created_at ? (
              <p className="text-xs text-muted-foreground">
                Oluşturulma:{" "}
                {new Date(project.created_at).toLocaleDateString("tr-TR")}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Görevler
          </h2>
          <p className="text-sm text-muted-foreground">
            Bu projeye ait görevler burada listelenecek.
          </p>
        </div>

        <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
          <CardHeader className="items-center text-center">
            <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
              <ListTodo className="size-6" />
            </div>
            <CardTitle className="text-lg text-foreground">
              Henüz görev yok
            </CardTitle>
            <CardDescription className="max-w-md">
              Görev yönetimi bir sonraki adımda eklenecek. Şimdilik bu alan
              proje görevleri için hazır bekliyor.
            </CardDescription>
          </CardHeader>
          <CardContent />
        </Card>
      </section>
    </div>
  );
}
