"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, X, AlertTriangle, Music, Calendar, Clock, HardDrive } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioProject, formatFileSize } from '@/lib/supabase/audio-projects';

interface DeleteProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  project: AudioProject | null;
  isDeleting?: boolean;
}

export function DeleteProjectDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  project, 
  isDeleting = false 
}: DeleteProjectDialogProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible || !project) return null;

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'Unknown';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const getActiveEffects = (project: AudioProject) => {
    const effects = [];
    if (project.effects_settings?.bass_boost?.enabled) {
      effects.push(`Bass Boost (${project.effects_settings.bass_boost.amount}dB)`);
    }
    if (project.effects_settings?.speed_control?.enabled) {
      effects.push(`Speed (${project.effects_settings.speed_control.speed}x)`);
    }
    if (project.effects_settings?.pitch_shift?.enabled) {
      effects.push(`Pitch (${project.effects_settings.pitch_shift.semitones > 0 ? '+' : ''}${project.effects_settings.pitch_shift.semitones})`);
    }
    return effects;
  };

  const activeEffects = getActiveEffects(project);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 20, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="w-full max-w-lg"
          >
            <Card className="shadow-xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-destructive/10 rounded-full">
                      <AlertTriangle className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <CardTitle className="text-destructive">Delete Project</CardTitle>
                      <CardDescription>
                        This action cannot be undone
                      </CardDescription>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={onClose}
                    disabled={isDeleting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Project Preview */}
                <motion.div 
                  className="p-4 bg-muted rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg flex-shrink-0">
                      <Music className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate mb-2">
                        {project.project_name}
                      </h3>
                      
                      {/* Project Details */}
                      <div className="grid grid-cols-1 gap-2 text-sm text-muted-foreground mb-3">
                        <div className="flex items-center gap-2">
                          <Music className="h-3 w-3" />
                          <span className="truncate">{project.original_filename}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(project.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{formatDuration(project.duration_seconds)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            <span>{formatFileSize(project.file_size_bytes)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Active Effects */}
                      {activeEffects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {activeEffects.map((effect, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {effect}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Warning Message */}
                <motion.div 
                  className="p-4 bg-destructive/5 border-2 border-destructive/40 rounded-lg"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-destructive mb-1">
                        This will permanently delete:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• The project and all its settings</li>
                        <li>• Original audio file from storage</li>
                        <li>• Any processed audio files</li>
                        <li>• This action cannot be undone</li>
                      </ul>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex gap-3"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button 
                    variant="outline" 
                    onClick={onClose}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={onConfirm}
                    disabled={isDeleting}
                    className="flex-1"
                  >
                    {isDeleting ? (
                      <>
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"
                        />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Project
                      </>
                    )}
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
