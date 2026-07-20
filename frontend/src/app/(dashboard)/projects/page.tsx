import { DashboardHome } from "@/components/dashboard/dashboard-home";
import {
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";

export default async function ProjectsPage() {
  const { userName, projects } = await getCurrentUserProjects();
  const stats = await getDashboardTaskStats(projects.map((p) => p.id));

  return (
    <DashboardHome userName={userName} projects={projects} stats={stats} />
  );
}
