"use client";

import { motion, easeOut } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";
import { Plus } from "lucide-react";
import { SavedProjects } from "./SavedProjects";
import { AudioProject } from "@/lib/supabase/audio-projects";
import { UserDropdown } from "@/components/user-dropdown";

interface DashboardClientProps {
  userEmail: string;
  projects: AudioProject[];
  projectsError: string | null;
}

//

export function DashboardClient({ userEmail, projects, projectsError }: DashboardClientProps) {
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  const handleNavigate = (url: string) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(url);
    }, 500); // Duration of exit animation
  };
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: easeOut
      }
    }
  };

  //

  return (
    <motion.div
      className="relative w-full px-6 py-6"
      initial={{ x: 0, opacity: 1 }}
      animate={{ 
        x: isExiting ? "-100%" : 0,
        opacity: isExiting ? 0 : 1
      }}
      transition={{ ease: "easeInOut", duration: 0.5 }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-6">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-2">
            <Music className="h-6 w-6" />
            <h1 className="text-2xl font-bold tracking-tight">Your Audio Projects</h1>
          </div>
          <p className="text-sm text-muted-foreground">Manage your saved audio projects with effects</p>
        </motion.div>
        <div className="z-50 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            className="group"
            onClick={() => handleNavigate('/studio')}
          >
            <Plus className="h-4 w-4 mr-2 group-hover:text-primary transition-colors" />
            Create New Project
          </Button>
          <UserDropdown userEmail={userEmail} />
        </div>
      </div>
      
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="w-full">
        {/* Projects Section */}
        <motion.div variants={itemVariants}>
          <SavedProjects initialProjects={projects} initialError={projectsError} onNavigate={handleNavigate} />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}