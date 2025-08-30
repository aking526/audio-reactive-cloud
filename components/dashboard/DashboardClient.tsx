"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, Sparkles, Zap, TrendingUp } from "lucide-react";
import { SavedProjects } from "./SavedProjects";
import { AudioProject } from "@/lib/supabase/audio-projects";
import { UserDropdown } from "@/components/user-dropdown";

interface DashboardClientProps {
  user: any;
  projects: AudioProject[];
  projectsError: string | null;
}

const FloatingIcon = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ 
      opacity: [0.4, 0.8, 0.4],
      y: [0, -10, 0],
    }}
    transition={{
      duration: 4,
      delay,
      repeat: Infinity,
      ease: "easeInOut"
    }}
    className="absolute"
  >
    {children}
  </motion.div>
);

export function DashboardClient({ user, projects, projectsError }: DashboardClientProps) {
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
        ease: "easeOut"
      }
    }
  };

  const heroVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.8,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      className="relative container mx-auto px-4 py-8"
      initial={{ x: 0, opacity: 1 }}
      animate={{ 
        x: isExiting ? "-100%" : 0,
        opacity: isExiting ? 0 : 1
      }}
      transition={{ ease: "easeInOut", duration: 0.5 }}
    >
      {/* User Dropdown in top-right */}
      <div className="absolute top-4 right-4 z-50">
        <UserDropdown userEmail={user.email} />
      </div>
      
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 py-8"
      >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Hero Section */}
        <motion.div variants={heroVariants} className="relative">
          <Card className="relative overflow-hidden border-0 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm">
            {/* Floating Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
              <FloatingIcon delay={0}>
                <Music className="h-8 w-8 text-primary/20 absolute top-8 left-12" />
              </FloatingIcon>
              <FloatingIcon delay={1}>
                <Sparkles className="h-6 w-6 text-primary/30 absolute top-16 right-16" />
              </FloatingIcon>
              <FloatingIcon delay={2}>
                <Zap className="h-7 w-7 text-primary/25 absolute bottom-12 left-20" />
              </FloatingIcon>
              <FloatingIcon delay={0.5}>
                <TrendingUp className="h-5 w-5 text-primary/35 absolute bottom-20 right-12" />
              </FloatingIcon>
            </div>
            
            <CardHeader className="relative text-center py-12">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <CardTitle className="text-3xl font-bold mb-2 bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
                  Welcome back! 👋
                </CardTitle>
                <CardDescription className="text-lg text-muted-foreground/80">
                  Ready to create something amazing with your audio projects?
                </CardDescription>
              </motion.div>
              
              {projects.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mt-6"
                >
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium">
                    <Music className="h-4 w-4" />
                    <span>{projects.length} project{projects.length !== 1 ? 's' : ''} ready</span>
                  </div>
                </motion.div>
              )}
            </CardHeader>
          </Card>
        </motion.div>

        {/* Projects Section */}
        <motion.div variants={itemVariants}>
          <SavedProjects initialProjects={projects} initialError={projectsError} onNavigate={handleNavigate} />
        </motion.div>

        {/* Additional Features Hint */}
        {projects.length === 0 && (
          <motion.div variants={itemVariants}>
            <Card className="border-dashed border-2 border-muted-foreground/20 bg-muted/20">
              <CardContent className="py-8 text-center">
                <motion.div
                  animate={{ 
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    repeatDelay: 3
                  }}
                  className="inline-block mb-4"
                >
                  <Sparkles className="h-12 w-12 text-primary/60" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">Your audio journey starts here</h3>
                <p className="text-muted-foreground">
                  Upload your first audio file and discover the power of real-time effects processing
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
      </motion.div>
    </motion.div>
  );
}