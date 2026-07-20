import { DashboardHome } from "@/components/dashboard/dashboard-home";
import {
  getCurrentUserProjects,
  getDashboardTaskStats,
} from "@/lib/supabase/server";
import type { DashboardProject, DashboardTaskStats } from "@/lib/supabase/types";

export default async function DashboardPage() {
  let userName = "Kullanıcı";
  let projects: DashboardProject[] = [];
  let stats: DashboardTaskStats = { total: 0, inProgress: 0, done: 0 };

  try {
    const result = await getCurrentUserProjects();
    userName = result.userName;
    projects = result.projects;
    stats = await getDashboardTaskStats(projects.map((p) => p.id));
  } catch (error) {
    console.error("[DashboardPage]", error);
  }

  return (
    <DashboardHome userName={userName} projects={projects} stats={stats} />
  );
}
