import { CheckSquare } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function MyTasksPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div>
        <p className="text-sm text-muted-foreground">My Tasks</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Görevlerim
        </h1>
      </div>
      <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <CheckSquare className="size-6" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Kişisel görev görünümü
          </CardTitle>
          <CardDescription className="max-w-md">
            Atandığın görevler burada toplanacak. Şimdilik proje board’undan
            görev ekleyebilirsin.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
