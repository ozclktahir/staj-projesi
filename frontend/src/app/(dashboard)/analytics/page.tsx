import { redirect } from "next/navigation";
import { withWorkspaceQuery } from "@/lib/active-workspace";
import { resolveActiveWorkspaceId } from "@/lib/active-workspace-server";

type AnalyticsRedirectProps = {
  searchParams: Promise<{ workspaceId?: string }>;
};

/** Eski /analytics rotası Dashboard’a yönlendirilir. */
export default async function AnalyticsRedirectPage({
  searchParams,
}: AnalyticsRedirectProps) {
  const params = await searchParams;
  const workspaceId = await resolveActiveWorkspaceId(
    params.workspaceId ?? null,
  );
  redirect(withWorkspaceQuery("/", workspaceId));
}
