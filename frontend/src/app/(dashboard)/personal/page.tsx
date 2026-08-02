import { Suspense } from "react";
import { Lock, NotebookPen } from "lucide-react";
import {
  getPersonalFiles,
  getPersonalNotes,
  getPersonalTodos,
} from "@/app/actions/personal";
import { getAssignedTasksByPriority } from "@/app/actions/tasks";
import { ListSkeleton } from "@/components/loading/page-skeletons";
import { I18nText } from "@/components/i18n-text";
import { PersonalWorkspace } from "@/components/personal/personal-workspace";
import { getAuthenticatedUser } from "@/lib/supabase/server";

async function PersonalContent() {
  const auth = await getAuthenticatedUser();

  if (!auth) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center text-sm text-muted-foreground">
        <I18nText k="personalPage.needAuth" />
      </div>
    );
  }

  const [assignedResult, notesResult, todosResult, filesResult] =
    await Promise.all([
      getAssignedTasksByPriority(),
      getPersonalNotes(),
      getPersonalTodos(),
      getPersonalFiles(),
    ]);

  const errors = [
    assignedResult.success ? null : assignedResult.error,
    notesResult.success ? null : notesResult.error,
    todosResult.success ? null : todosResult.error,
    filesResult.success ? null : filesResult.error,
  ].filter(Boolean);

  return (
    <>
      {errors.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">
            <I18nText k="personalPage.loadWarning" />
          </p>
          <p className="mt-1 text-xs opacity-90">
            {errors[0]} Gerekirse Supabase&apos;de{" "}
            <code className="rounded bg-background/60 px-1">
              add_personal_workspace.sql
            </code>{" "}
            /{" "}
            <code className="rounded bg-background/60 px-1">
              add_personal_notes_task_id.sql
            </code>{" "}
            migration&apos;ını çalıştır.
          </p>
        </div>
      ) : null}

      <PersonalWorkspace
        initialAssignedTasks={
          assignedResult.success ? assignedResult.tasks : []
        }
        initialNotes={notesResult.notes}
        initialTodos={todosResult.todos}
        initialFiles={filesResult.files}
      />
    </>
  );
}

export default function PersonalPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            <I18nText k="personalPage.title" />
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <NotebookPen className="size-6 text-primary" />
            <I18nText k="personalPage.subtitle" />
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            <I18nText k="personalPage.subtitleLong" />
          </p>
        </div>
      </div>

      <Suspense fallback={<ListSkeleton rows={6} />}>
        <PersonalContent />
      </Suspense>
    </div>
  );
}
