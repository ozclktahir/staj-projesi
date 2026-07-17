import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getCurrentUserProjects } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const { userName, projects } = await getCurrentUserProjects();

  return <DashboardHome userName={userName} projects={projects} />;
}
