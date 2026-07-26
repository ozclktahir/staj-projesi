import { ListTodo } from "lucide-react";
import { getMyTasks } from "@/app/actions/tasks";
import { PersonalKanbanBoard } from "@/components/my-tasks/personal-kanban-board";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function MyTasksPage() {
  const auth = await getAuthenticatedUser();
  const tasks = auth ? await getMyTasks() : [];
  const currentUserId = auth?.user.id ?? "";

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Kişisel panom</p>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Görevlerim
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Tüm projelerdeki sana atanmış görevler tek bir Kanban panosunda.
            Kartları sürükleyerek durumunu güncelleyebilirsin.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground shadow-sm">
          <ListTodo className="size-4 text-primary" />
          <span>
            <span className="font-semibold text-foreground">{tasks.length}</span>{" "}
            görev
          </span>
        </div>
      </div>

      {!currentUserId ? (
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center text-sm text-muted-foreground">
          Görevlerini görmek için giriş yapmalısın.
        </div>
      ) : (
        <PersonalKanbanBoard tasks={tasks} currentUserId={currentUserId} />
      )}
    </div>
  );
}
