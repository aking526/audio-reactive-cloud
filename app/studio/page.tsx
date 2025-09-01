"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import AudioUploader from "@/components/studio/AudioUploader";
import AudioPlayer from "@/components/studio/AudioPlayer";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle, Save } from "lucide-react";

import { AudioProject, audioProjectsService } from '@/lib/supabase/audio-projects';
import { UnsavedChangesDialog } from '@/components/studio/UnsavedChangesDialog';
import * as Tone from 'tone';

function StudioPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);

  const [loadedProject, setLoadedProject] = useState<AudioProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [triggerSaveDialog, setTriggerSaveDialog] = useState(false);
  const [savedProjectId, setSavedProjectId] = useState<string | null>(null);

  // Audio context refs (these will be passed to AudioPlayer and AudioAnalyzer)
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserInputNodeRef = useRef<GainNode | null>(null);
  
  // Track which project we've loaded to prevent duplicate loads
  const loadedProjectIdRef = useRef<string | null>(null);

  const handleAudioLoaded = useCallback((buffer: Tone.ToneAudioBuffer | null, file: File) => {
    setAudioFile(file);
  }, []);
  const handleReset = useCallback(() => {
    setAudioFile(null);
    setLoadedProject(null);
    setLoadError(null);
    loadedProjectIdRef.current = null;
    setHasUnsavedChanges(false);
    router.replace('/studio');
  }, [router]);

  const handleNavigation = useCallback((url: string) => {
    if (hasUnsavedChanges) {
      setPendingNavigation(url);
      setShowUnsavedDialog(true);
    } else {
      setIsExiting(true);
      setTimeout(() => {
        router.push(url);
      }, 500); // Duration of exit animation
    }
  }, [hasUnsavedChanges, router]);

  const handleSaveProject = () => {
    setTriggerSaveDialog(true);
  };

  const handleSaveDialogClose = () => {
    setTriggerSaveDialog(false);
  };

  const handleSaveCompleteForPlayer = useCallback((projectId: string) => {
    setSavedProjectId(projectId);
    setTimeout(() => {
      setSavedProjectId(null);
    }, 5000);
  }, []);

  const handleSaveAndNavigate = useCallback(() => {
    // Close the unsaved dialog and trigger the save dialog
    setShowUnsavedDialog(false);
    setTriggerSaveDialog(true);
  }, []);

  const handleDiscardAndNavigate = useCallback(() => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      setIsExiting(true);
      setTimeout(() => {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }, 500); // Duration of exit animation
    }
  }, [pendingNavigation, router]);

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingNavigation(null);
  }, []);

  const handleSaveCompleteWithNavigation = useCallback((projectId:string) => {
    handleSaveCompleteForPlayer(projectId);
    // Reset the trigger and navigate to pending destination
    setTriggerSaveDialog(false);
    setHasUnsavedChanges(false);
    if (pendingNavigation) {
      setIsExiting(true);
      setTimeout(() => {
        router.push(pendingNavigation);
        setPendingNavigation(null);
      }, 500); // Duration of exit animation
    }
  }, [pendingNavigation, router, handleSaveCompleteForPlayer]);

  const handleProjectUpdated = useCallback(() => {
    // Navigate to dashboard after project update
    setIsExiting(true);
    setTimeout(() => {
      router.push('/dashboard');
    }, 500); // Duration of exit animation
  }, [router]);

  const handleProjectCopied = useCallback((projectId: string) => {
    // Navigate to the new copy project
    setIsExiting(true);
    setTimeout(() => {
      router.push(`/studio?project=${projectId}`);
    }, 500); // Duration of exit animation
  }, [router]);

  // Load project from URL parameter
  useEffect(() => {
    const projectId = searchParams.get('project');
    if (projectId && projectId !== loadedProjectIdRef.current && !loadingProject) {
      loadProject(projectId);
    }
  }, [searchParams, loadingProject]);

  const loadProject = async (projectId: string) => {
    try {
      setLoadingProject(true);
      setLoadError(null);
      
      // Clean up any existing audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          await audioContextRef.current.close();
        } catch (e) {
          console.warn('Error closing existing audio context:', e);
        }
      }
      audioContextRef.current = null;
      sourceNodeRef.current = null;
      analyserInputNodeRef.current = null;
      
      // Mark this project as being loaded
      loadedProjectIdRef.current = projectId;
      
      const project = await audioProjectsService.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Convert the stored file URL to a File object
      const fileBlob = await audioProjectsService.getAudioFileBlob(project.original_file_url);
      const file = new File([fileBlob], project.original_filename, { 
        type: project.mime_type 
      });

      console.log('Loaded project file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        originalMimeType: project.mime_type
      });

      // Add debugging for navigation vs fresh load
      console.log('Studio page state during project load: navigation from dashboard');

      setLoadedProject(project);
      setAudioFile(file);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load project');
      // Reset the loaded project ref on error
      loadedProjectIdRef.current = null;
    } finally {
      setLoadingProject(false);
    }
  };

  return (
    <motion.div
      className="min-h-screen bg-background p-6"
      initial={{ x: "100%", opacity: 0 }}
      animate={{ 
        x: isExiting ? "100%" : 0,
        opacity: isExiting ? 0 : 1
      }}
      transition={{ ease: "easeInOut", duration: 0.5 }}
    >
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigation('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center gap-3">
              {savedProjectId && (
                <p className="text-sm text-green-600">
                  Project saved successfully!
                </p>
              )}
              {loadedProject && !hasUnsavedChanges && !savedProjectId && (
                 <p className="text-sm text-muted-foreground">
                   No changes to save
                 </p>
              )}
              <Button
                onClick={handleSaveProject}
                variant={hasUnsavedChanges ? "default" : "outline"}
                size="sm"
                className={`${!hasUnsavedChanges && loadedProject ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!hasUnsavedChanges && !!loadedProject}
              >
                <Save className="h-4 w-4 mr-2" />
                {loadedProject ? "Update Project" : "Save Project"}
              </Button>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2 sr-only">Audio Studio</h1>
          <p className="text-muted-foreground sr-only">
            {loadedProject ? `Editing: ${loadedProject.project_name}` : 'Create and process your audio'}
          </p>
        </header>

        <div className="space-y-6">
          {loadingProject ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading project...</p>
              </div>
            </div>
          ) : loadError ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Failed to Load Project</h3>
                <p className="text-muted-foreground mb-4">{loadError}</p>
                <Button onClick={handleReset} variant="outline">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Studio
                </Button>
              </div>
            </div>
          ) : !audioFile ? (
            <AudioUploader onAudioLoaded={handleAudioLoaded} />
          ) : (
            <div className="space-y-6">
              <AudioPlayer
                key={`${audioFile.name}-${audioFile.size}-${loadedProject?.id || 'new'}`}
                audioFile={audioFile}
                onPlayingChange={() => {}}
                audioContextRef={audioContextRef}
                sourceNodeRef={sourceNodeRef}
                analyserInputNodeRef={analyserInputNodeRef}
                loadedProject={loadedProject}
                onUnsavedChangesChange={setHasUnsavedChanges}
                triggerSaveDialog={triggerSaveDialog}
                onSaveCompleteWithNavigation={handleSaveCompleteWithNavigation}
                onSaveComplete={handleSaveCompleteForPlayer}
                onProjectUpdated={() => handleProjectUpdated()}
                onProjectCopied={handleProjectCopied}
                onSaveDialogClose={handleSaveDialogClose}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Unsaved Changes Dialog */}
      <UnsavedChangesDialog
        isOpen={showUnsavedDialog}
        onClose={handleCancelNavigation}
        onSave={handleSaveAndNavigate}
        onDiscard={handleDiscardAndNavigate}
      />
    </motion.div>
  );
}

export default function StudioPage() {
  return (
    <Suspense fallback={null}>
      <StudioPageContent />
    </Suspense>
  );
}