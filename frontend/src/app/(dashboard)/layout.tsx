import { redirect } from "next/navigation";
import { ensureWorkspaceAccess } from "@/app/actions/workspace-access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await ensureWorkspaceAccess();

  if (!access.hasAccess) {
    redirect("/unauthorized");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
