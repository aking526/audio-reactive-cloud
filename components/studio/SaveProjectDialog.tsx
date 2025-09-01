/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Music, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AudioEffectsSettings, audioProjectsService, validateFileSize } from '@/lib/supabase/audio-projects';

interface SaveProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  audioFile: File;
  effectsSettings: AudioEffectsSettings;
  onSaveComplete: (projectId: string, wasUpdate: boolean) => void;
  existingProject?: {
    id: string;
    project_name: string;
  } | null;
}

export function SaveProjectDialog({ 
  isOpen, 
  onClose, 
  audioFile, 
  effectsSettings, 
  onSaveComplete,
  existingProject 
}: SaveProjectDialogProps) {
  const [projectName, setProjectName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'uploading' | 'processing' | 'complete'>('idle');
  const [saveAsCopy, setSaveAsCopy] = useState(false);

  // Set project name when editing existing project
  // Only run when dialog first opens, not on every prop change
  useEffect(() => {
    if (isOpen) {
      if (existingProject) {
        setProjectName(existingProject.project_name);
      } else {
        setProjectName('');
      }
      setSaveAsCopy(false); // Reset save as copy option
    }
  }, [isOpen]); // Only depend on isOpen, not existingProject

  const fileSizeValidation = validateFileSize(audioFile);
  const isFileTooLarge = !fileSizeValidation.isValid;

  const handleSave = async () => {
    if (!projectName.trim()) {
      setError('Please enter a project name');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      let project;
      const isUpdate: boolean = !!(existingProject && !saveAsCopy);
      
      if (isUpdate && existingProject) {
        // Update existing project
        setSaveStatus('processing');
        const updateData = {
          project_name: projectName.trim(),
          effects_settings: effectsSettings
        };
        
        project = await audioProjectsService.updateProject(existingProject.id, updateData);
      } else {
        // Create new project (either from scratch or as a copy)
        // Validate file size for new projects
        const fileSizeValidation = validateFileSize(audioFile);
        if (!fileSizeValidation.isValid) {
          setError(fileSizeValidation.error || 'File size validation failed');
          return;
        }

        setSaveStatus('uploading');
        
        // Get audio duration
        const duration = await getAudioDuration(audioFile);

        const projectData = {
          project_name: projectName.trim(),
          original_filename: audioFile.name,
          file_size_bytes: audioFile.size,
          duration_seconds: duration,
          mime_type: audioFile.type,
          effects_settings: effectsSettings
        };

        setSaveStatus('processing');
        project = await audioProjectsService.createProject(projectData, audioFile);
      }
      
      setSaveStatus('complete');
      
      // Immediately complete the save and redirect
      onSaveComplete(project.id, isUpdate);
      onClose();
      resetDialog();

    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${existingProject ? 'update' : 'save'} project`);
      setSaveStatus('idle');
    } finally {
      setIsSaving(false);
    }
  };

  const resetDialog = () => {
    setProjectName('');
    setError(null);
    setSaveStatus('idle');
    setIsSaving(false);
    setSaveAsCopy(false);
  };

  const handleClose = () => {
    if (!isSaving) {
      onClose();
      resetDialog();
    }
  };

  // Helper function to get audio duration
  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);
      
      audio.addEventListener('loadedmetadata', () => {
        resolve(audio.duration);
        URL.revokeObjectURL(url);
      });
      
      audio.addEventListener('error', () => {
        resolve(0); // Fallback if we can't get duration
        URL.revokeObjectURL(url);
      });
      
      audio.src = url;
    });
  };

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get active effects summary
  const getActiveEffects = () => {
    const active = [];
    if (effectsSettings.bass_boost?.enabled) {
      active.push(`Bass Boost (${effectsSettings.bass_boost.amount}dB)`);
    }
    if (effectsSettings.speed_control?.enabled) {
      active.push(`Speed (${effectsSettings.speed_control.speed}x)`);
    }
    if (effectsSettings.pitch_shift?.enabled) {
      active.push(`Pitch (${effectsSettings.pitch_shift.semitones > 0 ? '+' : ''}${effectsSettings.pitch_shift.semitones})`);
    }
    return active;
  };

  const activeEffects = getActiveEffects();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="w-full max-w-md">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music className="h-5 w-5" />
                    <CardTitle>
                      {existingProject && !saveAsCopy ? 'Update Audio Project' : 'Save Audio Project'}
                    </CardTitle>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClose}
                    disabled={isSaving}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>
                  {existingProject && !saveAsCopy
                    ? 'Update your audio project with the current effects settings'
                    : saveAsCopy
                    ? 'Save a copy of this project with your current changes'
                    : 'Save your audio project with applied effects to your library'
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Project Name Input */}
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Enter project name..."
                    disabled={isSaving}
                    className={error && !projectName.trim() ? 'border-red-500' : ''}
                  />
                </div>

                {/* Save as Copy Option for existing projects */}
                {existingProject && (
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="save-as-copy"
                        checked={saveAsCopy}
                        onChange={(e) => setSaveAsCopy(e.target.checked)}
                        disabled={isSaving}
                        className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4"
                      />
                      <Label htmlFor="save-as-copy" className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer">
                        <span className="text-lg">📋</span>
                        <span>Save as a new copy instead of updating the original</span>
                      </Label>
                    </div>
                    {saveAsCopy && (
                      <p className="text-xs text-muted-foreground mt-2 ml-7">
                        ✨ This will create a new project and keep you in the studio
                      </p>
                    )}
                  </div>
                )}

                {/* File Information */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">File Information</h4>
                  <div className="bg-muted p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Filename:</span>
                      <span className="font-medium">{audioFile.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Size:</span>
                      <span>{formatFileSize(audioFile.size)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>{audioFile.type || 'Unknown'}</span>
                    </div>
                  </div>
                </div>

                {/* Applied Effects */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Applied Effects</h4>
                  {activeEffects.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeEffects.map((effect, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {effect}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No effects applied</p>
                  )}
                </div>

                {/* Save Status */}
                {saveStatus !== 'idle' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {saveStatus === 'complete' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      )}
                      <span className="text-sm font-medium">
                        {saveStatus === 'uploading' && 'Uploading file...'}
                        {saveStatus === 'processing' && (existingProject && !saveAsCopy ? 'Updating project...' : 'Creating project...')}
                        {saveStatus === 'complete' && (existingProject && !saveAsCopy ? 'Project updated successfully!' : 'Project saved successfully!')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>{error}</span>
                  </div>
                )}

                {/* File Size Warning - only for new projects */}
                {isFileTooLarge && !existingProject && (
                  <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                    <div className="h-4 w-4 rounded-full bg-yellow-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">File too large to save</p>
                      <p className="text-yellow-700">
                        File size: {formatFileSize(audioFile.size)}. Maximum allowed: 50MB.
                        Please compress your audio file to save this project.
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    onClick={handleClose}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || !projectName.trim() || (isFileTooLarge && !existingProject)}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {existingProject && !saveAsCopy ? 'Update Project' : 'Save Project'}
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
