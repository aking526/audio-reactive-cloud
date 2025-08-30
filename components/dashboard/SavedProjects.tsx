"use client";

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Music, 
  Play, 
  Trash2, 
  Calendar,
  Clock,
  HardDrive,
  Plus
} from "lucide-react";
import { AudioProject, audioProjectsService, formatFileSize } from '@/lib/supabase/audio-projects';

interface SavedProjectsProps {
  initialProjects?: AudioProject[];
  initialError?: string | null;
  onNavigate?: (url: string) => void;
}

export function SavedProjects({ initialProjects = [], initialError = null, onNavigate }: SavedProjectsProps) {
  const [projects, setProjects] = useState<AudioProject[]>(initialProjects);
  const [loading, setLoading] = useState(false); // Start with false since we have initial data
  const [error, setError] = useState<string | null>(initialError);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Only load projects if we don't have initial data and there's no initial error
    if (initialProjects.length === 0 && !initialError) {
      loadProjects();
    }
  }, [initialProjects.length, initialError]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const userProjects = await audioProjectsService.getUserProjects();
      setProjects(userProjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(projectId);
      await audioProjectsService.deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeletingId(null);
    }
  };



  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActiveEffects = (project: AudioProject) => {
    const active = [];
    if (project.effects_settings.bass_boost?.enabled) {
      active.push(`Bass Boost (${project.effects_settings.bass_boost.amount}dB)`);
    }
    if (project.effects_settings.speed_control?.enabled) {
      active.push(`Speed (${project.effects_settings.speed_control.speed}x)`);
    }
    if (project.effects_settings.pitch_shift?.enabled) {
      active.push(`Pitch (${project.effects_settings.pitch_shift.semitones > 0 ? '+' : ''}${project.effects_settings.pitch_shift.semitones})`);
    }
    return active;
  };

  if (loading && projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-center py-12"
      >
        <div className="text-center">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Loading your projects...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-red-600 mb-4"
        >
          {error}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Button onClick={loadProjects} variant="outline">
            Try Again
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center py-12"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        </motion.div>
        <motion.h3 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg font-semibold mb-2"
        >
          No projects yet
        </motion.h3>
        <motion.p 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-muted-foreground mb-6"
        >
          Start by uploading an audio file in the studio and applying some effects!
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            size="lg"
            className="bg-gradient-to-r from-primary to-primary/80"
            onClick={() => onNavigate?.('/studio')}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
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
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div 
        className="grid gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        layout
        transition={{ layout: { duration: 0.25, ease: "easeOut" } }}
      >
        <AnimatePresence>
          {projects.map((project, index) => {
            const activeEffects = getActiveEffects(project);
            
            return (
              <motion.div
                key={project.id}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -8, scale: 0.98, transition: { duration: 0.2 } }}
                whileHover={{ y: -2, scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                style={{ originY: 0 }}
                layout
                transition={{ layout: { type: "spring", stiffness: 500, damping: 40 } }}
              >
                <Card className="relative border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-gradient-to-r from-card to-card/50">
                  <CardContent className="p-4">
                    <motion.div layout>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        {/* Project Header */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg truncate">
                            {project.project_name}
                          </h3>
                          {activeEffects.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 + 0.3 }}
                            >
                              <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border-primary/20">
                                {activeEffects.length} effect{activeEffects.length !== 1 ? 's' : ''}
                              </Badge>
                            </motion.div>
                          )}
                        </div>

                        {/* File Info */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                          <div className="flex items-center gap-1">
                            <Music className="h-3 w-3" />
                            <span className="truncate max-w-[200px]">{project.original_filename}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(project.file_size_bytes)}</span>
                          </div>
                          {project.duration_seconds && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{formatDuration(project.duration_seconds)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.created_at)}</span>
                          </div>
                        </div>

                        {/* Active Effects */}
                        {activeEffects.length > 0 && (
                          <motion.div 
                            className="flex flex-wrap gap-1 mb-3"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: index * 0.1 + 0.4 }}
                          >
                            {activeEffects.map((effect, effectIndex) => (
                              <motion.div
                                key={effectIndex}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 + 0.4 + effectIndex * 0.05 }}
                              >
                                <Badge variant="outline" className="text-xs border-primary/20 text-primary/80">
                                  {effect}
                                </Badge>
                              </motion.div>
                            ))}
                          </motion.div>
                        )}
                      </div>

                      {/* Actions */}
                      <motion.div 
                        className="flex items-center gap-2 ml-4"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 + 0.2 }}
                      >
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => onNavigate?.(`/studio?project=${project.id}`)}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Open
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProject(project.id, project.project_name)}
                            disabled={deletingId === project.id}
                          >
                            {deletingId === project.id ? (
                              <motion.div 
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                className="h-4 w-4 border-2 border-current border-t-transparent rounded-full"
                              />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </motion.div>
                      </motion.div>
                    </div>
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </motion.div>

      {/* Create New Project button moved to header */}
    </motion.div>
  );
}
