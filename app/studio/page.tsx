"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from "framer-motion";
import AudioUploader from "@/components/studio/AudioUploader";
import AudioPlayer from "@/components/studio/AudioPlayer";
// import { VisualizationScene } from '@/components/visualization/VisualizationScene';
// import { VisualizationControls } from '@/components/visualization/VisualizationControls';
// import { AudioAnalyzer } from '@/components/visualization/AudioAnalyzer';
// import { AudioFeatures } from '@/components/visualization/types';
// import { VisualizationSettings, StudioVisualizationState } from '@/components/visualization/types';
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import { AudioProject, audioProjectsService } from '@/lib/supabase/audio-projects';
import { UnsavedChangesDialog } from '@/components/studio/UnsavedChangesDialog';
import * as Tone from 'tone';

/*
const defaultSettings: VisualizationSettings = {
  sensitivity: 1,
  smoothing: 0.8,
  colorScheme: 'rainbow',
  quality: 'high',
  deformationIntensity: 0.7,
  particleIntensity: 0.5,
  glowIntensity: 0.6
};
*/

export default function StudioPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isExiting, setIsExiting] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  // const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadedProject, setLoadedProject] = useState<AudioProject | null>(null);
  const [loadingProject, setLoadingProject] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<string | null>(null);
  const [triggerSaveDialog, setTriggerSaveDialog] = useState(false);
/*
  const [visualizationState, setVisualizationState] = useState<StudioVisualizationState>({
    currentVisualization: 'sphere',
    audioFeatures: null,
    settings: defaultSettings,
    isActive: false
  });
  */

  // Audio context refs (these will be passed to AudioPlayer and AudioAnalyzer)
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const analyserInputNodeRef = useRef<GainNode | null>(null);
  
  // Track which project we've loaded to prevent duplicate loads
  const loadedProjectIdRef = useRef<string | null>(null);

  const handleAudioLoaded = useCallback((buffer: Tone.ToneAudioBuffer | null, file: File) => {
    setAudioFile(file);
    // setVisualizationState(prev => ({ ...prev, isActive: true }));
  }, []);
/*
  const handleAudioFeaturesUpdate = useCallback((features: AudioFeatures) => {
    setAudioFeatures(features);
    setVisualizationState(prev => ({ ...prev, audioFeatures: features }));
  }, []);



  const handleSettingsChange = useCallback((newSettings: Partial<VisualizationSettings>) => {
    setVisualizationState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  }, []);
*/
  const handleReset = useCallback(() => {
    setAudioFile(null);
    setLoadedProject(null);
    setLoadError(null);
    loadedProjectIdRef.current = null;
    setHasUnsavedChanges(false);
    // setVisualizationState(prev => ({ ...prev, isActive: false, audioFeatures: null }));
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

  const handleSaveCompleteWithNavigation = useCallback((projectId: string) => {
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
  }, [pendingNavigation, router]);

  const handleProjectUpdated = useCallback((projectId: string) => {
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
      // setVisualizationState(prev => ({ ...prev, isActive: true }));
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
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleNavigation('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <h1 className="text-4xl font-bold text-foreground mb-2">Audio Studio</h1>
          <p className="text-muted-foreground">
            {loadedProject ? `Editing: ${loadedProject.project_name}` : 'Create, process, and visualize your audio'}
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Audio Controls */}
          <div className="lg:col-span-1 space-y-6">
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
                  onPlayingChange={setIsPlaying}
                  audioContextRef={audioContextRef}
                  sourceNodeRef={sourceNodeRef}
                  analyserInputNodeRef={analyserInputNodeRef}
                  loadedProject={loadedProject}
                  onUnsavedChangesChange={setHasUnsavedChanges}
                  triggerSaveDialog={triggerSaveDialog}
                  onSaveCompleteWithNavigation={handleSaveCompleteWithNavigation}
                  onProjectUpdated={handleProjectUpdated}
                  onProjectCopied={handleProjectCopied}
                />
{/*
                <VisualizationControls
                  settings={visualizationState.settings}
                  onSettingsChange={handleSettingsChange}
                  isActive={visualizationState.isActive}
                />
*/}
              </div>
            )}
          </div>

          {/* Right Column - 3D Visualization */}
          {/*
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border p-4">
              <h2 className="text-xl font-semibold mb-4">3D Audio Visualization</h2>

              {visualizationState.isActive ? (
                <div className="relative w-full h-96 lg:h-[600px]">
                  {audioFeatures ? (
                    <VisualizationScene
                      audioFeatures={audioFeatures}
                      currentVisualization={visualizationState.currentVisualization}
                      settings={visualizationState.settings}
                      className="w-full h-full rounded-lg overflow-hidden"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <p className="text-lg mb-2">Initializing visualization...</p>
                        <p className="text-sm">Start playing audio to see the visualization</p>
                      </div>
                    </div>
                  )}

                  <AudioAnalyzer
                    audioContext={audioContextRef.current}
                    analyserInputNode={analyserInputNodeRef.current}
                    isPlaying={isPlaying}
                    onFeaturesUpdate={handleAudioFeaturesUpdate}
                  />
                </div>
              ) : (
                <div className="w-full h-96 lg:h-[600px] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <p className="text-lg mb-2">No audio loaded</p>
                    <p className="text-sm">Upload an audio file to see the visualization</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          */}
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