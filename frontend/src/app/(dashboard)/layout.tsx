import { redirect } from "next/navigation";
import { ensureWorkspaceAccess } from "@/app/actions/workspace-access";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await ensureWorkspaceAccess();

  // Cookie var ama SSR oturum yoksa / ↔ /login döngüsünü kır
  if (!access.userId) {
    redirect("/clear-session");
  }

  // Davet zorunluluğu yok: workspace'i olmayan kullanıcı onboarding'e gider
  if (!access.hasAccess) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
