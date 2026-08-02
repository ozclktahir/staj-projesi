import { Suspense } from "react";
import { getWorkspaceMembers } from "@/app/actions/workspace-members";
import { getCurrentUserDisplayLabel } from "@/app/actions/current-user";
import { MembersTable } from "@/components/members/members-table";
import { DashboardSkeleton } from "@/components/loading/page-skeletons";
import { I18nText } from "@/components/i18n-text";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";

type MembersPageProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

async function MembersContent({
  searchParams,
}: {
  searchParams: Promise<{ workspaceId?: string }>;
}) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(
    params.workspaceId ?? null,
  );

  if (!workspaceId) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-lg border border-dashed border-border bg-card/60 px-4 py-10 text-center text-sm text-muted-foreground">
          <I18nText k="membersPage.needWorkspace" />
        </div>
      </div>
    );
  }

  const [membersResult, me] = await Promise.all([
    getWorkspaceMembers(workspaceId),
    getCurrentUserDisplayLabel(),
  ]);

  if (!membersResult.success) {
    return (
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
        <div className="rounded-lg border border-rose-300/50 bg-rose-50 px-4 py-6 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
          {membersResult.error}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <I18nText k="membersPage.eyebrow" />
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          <I18nText k="membersPage.title" as="span" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <I18nText
            k={
              membersResult.isAdmin
                ? "membersPage.subtitleAdmin"
                : "membersPage.subtitle"
            }
          />
        </p>
      </div>
      <MembersTable
        workspaceId={workspaceId}
        members={membersResult.members}
        isAdmin={membersResult.isAdmin}
        currentUserId={me.userId ?? null}
      />
    </div>
  );
}

export default function MembersPage({ searchParams }: MembersPageProps) {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <MembersContent searchParams={searchParams} />
    </Suspense>
  );
}
