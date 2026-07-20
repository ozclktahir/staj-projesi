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
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          My Tasks
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Görevlerim
        </h1>
      </div>
      <Card className="rounded-lg border border-dashed border-slate-200 bg-white">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-11 items-center justify-center rounded-md bg-slate-100 text-slate-600">
            <CheckSquare className="size-5" />
          </div>
          <CardTitle className="text-lg text-slate-900">
            Kişisel görev görünümü
          </CardTitle>
          <CardDescription className="max-w-md text-slate-500">
            Atandığın görevler burada toplanacak. Şimdilik proje board’undan
            görev ekleyebilirsin.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
