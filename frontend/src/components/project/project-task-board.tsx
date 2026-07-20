import { ListTodo } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUSES,
  TASK_STATUS_LABELS,
  type ProjectTask,
  type TaskStatus,
} from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type ProjectTaskBoardProps = {
  tasks: ProjectTask[];
};

const columnAccent: Record<TaskStatus, string> = {
  TODO: "border-t-muted-foreground/40",
  IN_PROGRESS: "border-t-primary",
  DONE: "border-t-emerald-500",
};

function priorityClass(priority: ProjectTask["priority"]): string {
  switch (priority) {
    case "HIGH":
      return "text-red-500";
    case "LOW":
      return "text-muted-foreground";
    default:
      return "text-primary";
  }
}

export function ProjectTaskBoard({ tasks }: ProjectTaskBoardProps) {
  if (tasks.length === 0) {
    return (
      <Card className="rounded-[var(--radius)] border-dashed border-border bg-card/60">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-[var(--radius)] bg-primary/15 text-primary">
            <ListTodo className="size-6" />
          </div>
          <CardTitle className="text-lg text-foreground">
            Henüz görev yok
          </CardTitle>
          <CardDescription className="max-w-md">
            Bu projeye ilk görevini eklemek için &quot;Yeni Görev Ekle&quot;
            butonunu kullan.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);

        return (
          <section
            key={status}
            className={cn(
              "rounded-[var(--radius)] border border-border border-t-4 bg-card/40 p-3",
              columnAccent[status],
            )}
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <h3 className="text-sm font-semibold text-foreground">
                {TASK_STATUS_LABELS[status]}
              </h3>
              <span className="text-xs text-muted-foreground">
                {columnTasks.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {columnTasks.length === 0 ? (
                <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                  Bu kolonda görev yok
                </p>
              ) : (
                columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    className="rounded-[var(--radius)] border-border bg-card shadow-none"
                  >
                    <CardHeader className="space-y-2 p-4 pb-2">
                      <CardTitle className="text-base leading-snug text-foreground">
                        {task.title}
                      </CardTitle>
                      {task.description?.trim() ? (
                        <CardDescription className="line-clamp-3">
                          {task.description}
                        </CardDescription>
                      ) : null}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2 p-4 pt-0">
                      <span
                        className={cn(
                          "text-xs font-medium",
                          priorityClass(task.priority),
                        )}
                      >
                        {TASK_PRIORITY_LABELS[task.priority] ??
                          TASK_PRIORITY_LABELS.MEDIUM}
                      </span>
                      {task.created_at ? (
                        <span className="text-xs text-muted-foreground">
                          {new Date(task.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
