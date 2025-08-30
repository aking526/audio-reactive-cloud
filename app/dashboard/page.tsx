import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { audioProjectsServerService } from "@/lib/supabase/audio-projects-server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  
  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  const user = data.claims;

  // Fetch user projects on the server side
  let projects = [];
  let projectsError = null;
  try {
    projects = await audioProjectsServerService.getUserProjects();
  } catch (err) {
    projectsError = err instanceof Error ? err.message : 'Failed to load projects';
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <DashboardClient user={user} projects={projects} projectsError={projectsError} />
    </main>
  );
}