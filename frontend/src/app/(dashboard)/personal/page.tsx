import { Lock, NotebookPen } from "lucide-react";
import {
  getPersonalFiles,
  getPersonalNotes,
  getPersonalTodos,
} from "@/app/actions/personal";
import { PersonalWorkspace } from "@/components/personal/personal-workspace";
import { getAuthenticatedUser } from "@/lib/supabase/server";

export default async function PersonalPage() {
  const auth = await getAuthenticatedUser();

  if (!auth) {
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-dashed border-border bg-card/60 px-6 py-16 text-center text-sm text-muted-foreground">
        Kişisel alanına girmek için oturum açmalısın.
      </div>
    );
  }

  const [notesResult, todosResult, filesResult] = await Promise.all([
    getPersonalNotes(),
    getPersonalTodos(),
    getPersonalFiles(),
  ]);

  const errors = [
    notesResult.success ? null : notesResult.error,
    todosResult.success ? null : todosResult.error,
    filesResult.success ? null : filesResult.error,
  ].filter(Boolean);

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <Lock className="size-3.5" />
            Gizli kişisel alan
          </p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
            <NotebookPen className="size-6 text-primary" />
            Notlar ve Planlayıcı
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Notların, kişisel yapılacakların ve dosyaların yalnızca senin
            hesabına aittir. Diğer workspace üyeleri burayı göremez.
          </p>
        </div>
      </div>

      {errors.length > 0 ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="font-medium">Veri yüklenirken uyarı</p>
          <p className="mt-1 text-xs opacity-90">
            {errors[0]} Supabase&apos;de{" "}
            <code className="rounded bg-background/60 px-1">
              add_personal_workspace.sql
            </code>{" "}
            migration&apos;ını çalıştırdığından emin ol.
          </p>
        </div>
      ) : null}

      <PersonalWorkspace
        initialNotes={notesResult.notes}
        initialTodos={todosResult.todos}
        initialFiles={filesResult.files}
      />
    </div>
  );
}
