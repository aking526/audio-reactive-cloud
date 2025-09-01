import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { audioProjectsServerService } from "@/lib/supabase/audio-projects-server";
import type { AudioProject } from "@/lib/supabase/audio-projects";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: userResult, error } = await supabase.auth.getUser();
  
  if (error || !userResult?.user) {
    redirect("/auth/login");
  }

  const userEmail = userResult.user.email ?? "";

  // Fetch user projects on the server side
  let projects: AudioProject[] = [];
  let projectsError: string | null = null;
  try {
    projects = await audioProjectsServerService.getUserProjects();
  } catch (err) {
    projectsError = err instanceof Error ? err.message : 'Failed to load projects';
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <DashboardClient userEmail={userEmail} projects={projects} projectsError={projectsError} />
    </main>
  );
}