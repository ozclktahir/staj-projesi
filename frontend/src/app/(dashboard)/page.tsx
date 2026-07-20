import { DashboardHome } from "@/components/dashboard/dashboard-home";
import { getCurrentUserProjects } from "@/lib/supabase/server";

export default async function DashboardPage() {
  let userName = "Kullanıcı";
  let projects: Awaited<
    ReturnType<typeof getCurrentUserProjects>
  >["projects"] = [];

  try {
    const result = await getCurrentUserProjects();
    userName = result.userName;
    projects = result.projects;
  } catch (error) {
    console.error("[DashboardPage]", error);
  }

  return <DashboardHome userName={userName} projects={projects} />;
}
