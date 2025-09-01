/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Play, 
  Pause, 
  Volume2, 
  Music, 
  Settings,
  RotateCcw,
  Undo2
} from "lucide-react";
import { SaveProjectDialog } from './SaveProjectDialog';
import { AudioEffectsSettings } from '@/lib/supabase/audio-projects';

interface AudioPlayerProps {
  audioFile: File;
  onPlayingChange?: (isPlaying: boolean) => void;
  audioContextRef?: React.MutableRefObject<AudioContext | null>;
  sourceNodeRef?: React.MutableRefObject<MediaElementAudioSourceNode | null>;
  analyserInputNodeRef?: React.MutableRefObject<GainNode | null>;
  loadedProject?: {
    id: string;
    project_name: string;
    effects_settings: AudioEffectsSettings;
  } | null;
  onUnsavedChangesChange?: (hasUnsavedChanges: boolean) => void;
  triggerSaveDialog?: boolean;
  onSaveCompleteWithNavigation?: (projectId: string) => void;
  onProjectUpdated?: (projectId: string) => void;
  onProjectCopied?: (projectId: string) => void;
  onSaveComplete: (projectId: string) => void;
  onSaveDialogClose?: () => void;
}

// Pitch Shifter class that handles the audio processing for pitch shifting
class PitchShifter {
  context: AudioContext;
  inputNode: GainNode;
  outputNode: GainNode;
  processor: ScriptProcessorNode;
  shift: number = 0;
  active: boolean = false;

  constructor(audioContext: AudioContext) {
    this.context = audioContext;
    this.inputNode = this.context.createGain();
    this.outputNode = this.context.createGain();
    
    this.processor = this.context.createScriptProcessor(4096, 1, 1);
    this.processor.onaudioprocess = this.processAudio.bind(this);
    
    this.inputNode.connect(this.processor);
    this.processor.connect(this.outputNode);
  }

  setPitchShift(semitones: number) {
    this.shift = Math.pow(2, semitones / 12);
  }

  setActive(isActive: boolean) {
    this.active = isActive;
  }

  processAudio(event: AudioProcessingEvent) {
    const inputBuffer = event.inputBuffer;
    const outputBuffer = event.outputBuffer;
    
    const inputData = inputBuffer.getChannelData(0);
    const outputData = outputBuffer.getChannelData(0);
    
    if (!this.active) {
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i];
      }
      return;
    }
    
    const pitchRatio = this.shift;
    
    if (pitchRatio === 1.0) {
      for (let i = 0; i < inputData.length; i++) {
        outputData[i] = inputData[i];
      }
    } else {
      let readIndex = 0;
      const readIndexStep = pitchRatio;
      
      for (let i = 0; i < outputData.length; i++) {
        const intIndex = Math.floor(readIndex);
        const fraction = readIndex - intIndex;
        
        if (intIndex < inputData.length - 1) {
          outputData[i] = (1 - fraction) * inputData[intIndex] + fraction * inputData[intIndex + 1];
        } else if (intIndex < inputData.length) {
          outputData[i] = inputData[intIndex];
        } else {
          outputData[i] = 0;
        }
        
        readIndex += readIndexStep;
      }
    }
  }

  connect(destination: AudioNode) {
    this.outputNode.connect(destination);
  }

  disconnect() {
    this.inputNode.disconnect();
    this.processor.disconnect();
    this.outputNode.disconnect();
  }
}

const AudioPlayer = ({
  audioFile,
  onPlayingChange,
  audioContextRef: externalAudioContextRef,
  sourceNodeRef: externalSourceNodeRef,
  analyserInputNodeRef: externalAnalyserInputNodeRef,
  loadedProject,
  onUnsavedChangesChange,
  triggerSaveDialog,
  onSaveCompleteWithNavigation,
  onProjectUpdated,
  onProjectCopied,
  onSaveComplete,
  onSaveDialogClose
}: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const localAudioContextRef = useRef<AudioContext | null>(null);
  const localSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const visualizationRef = useRef<HTMLDivElement | null>(null);
  
  // Use external refs if provided, otherwise use local refs
  const audioContextRef = externalAudioContextRef || localAudioContextRef;
  const sourceNodeRef = externalSourceNodeRef || localSourceNodeRef;
  const gainNodeRef = useRef<GainNode | null>(null);
  const localAnalyserInputNodeRef = useRef<GainNode | null>(null); // Local fallback
  const pitchShifterRef = useRef<PitchShifter | null>(null);
  const bassBoostNodeRef = useRef<BiquadFilterNode | null>(null);

  // Use external ref if provided, otherwise use local ref
  const analyserInputNodeRef = externalAnalyserInputNodeRef || localAnalyserInputNodeRef;

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [pitchShiftEnabled, setPitchShiftEnabled] = useState(false);
  const [pitchValue, setPitchValue] = useState(0);
  const [speedControlEnabled, setSpeedControlEnabled] = useState(false);
  const [speedValue, setSpeedValue] = useState(1.0);
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [bassBoostAmount, setBassBoostAmount] = useState(6);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [projectName, setProjectName] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalEffectsSettings, setOriginalEffectsSettings] = useState<AudioEffectsSettings | null>(null);



  useEffect(() => {
    console.log('AudioPlayer useEffect triggered with file:', audioFile.name, audioFile.type);
    
    // Reset playback state when new file loads
    setIsPlaying(false);
    setCurrentTime(0);
    setSeekValue(0);
    setDuration(0);
    onPlayingChange?.(false);
    
    const url = URL.createObjectURL(audioFile);
    console.log('Created object URL:', url);
    
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.volume = volume;
    
    // Add detailed error handling for the audio element
    let hasSuccessfullyLoaded = false;
    let hasReportedError = false;

    const handleAudioError = () => {
      // Only report error if we haven't successfully loaded and haven't reported yet
      if (hasSuccessfullyLoaded || hasReportedError) return;
      hasReportedError = true;

      console.error('HTML Audio element error for file:', audioFile.name);
      if (audio.error) {
        const errorDetails = {
          code: audio.error.code,
          message: audio.error.message || 'No error message available',
          MEDIA_ERR_ABORTED: audio.error.code === MediaError.MEDIA_ERR_ABORTED,
          MEDIA_ERR_NETWORK: audio.error.code === MediaError.MEDIA_ERR_NETWORK,
          MEDIA_ERR_DECODE: audio.error.code === MediaError.MEDIA_ERR_DECODE,
          MEDIA_ERR_SRC_NOT_SUPPORTED: audio.error.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED
        };
        console.error('Audio error details:', errorDetails);

        let errorMessage = '';
        let shouldReportError = true;

        switch(audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            errorMessage = 'Audio loading was aborted';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            errorMessage = 'Network error while loading audio';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            errorMessage = 'Audio decoding error - file may be corrupted';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            // For WAV files, browsers sometimes report this error even when they can play the file
            // Let's check if it's actually a WAV file and give it more time
            if (audioFile.name.toLowerCase().endsWith('.wav') || audioFile.type === 'audio/wav') {
              console.warn('WAV file format error detected - this may be a browser quirk. Audio may still play correctly.');
              // Don't report this as a fatal error for WAV files
              shouldReportError = false;
            } else {
              errorMessage = 'Audio format not supported by browser';
            }
            break;
          default:
            errorMessage = 'Unknown audio error';
        }

        if (shouldReportError) {
          console.error('Audio error:', errorMessage);
        }
      }
    };

    // Listen for successful loading events
    audio.addEventListener('canplaythrough', () => {
      hasSuccessfullyLoaded = true;
      console.log('Audio can play through successfully');
    });

    audio.addEventListener('canplay', () => {
      hasSuccessfullyLoaded = true;
      console.log('Audio can play');
    });

    audio.addEventListener('loadeddata', () => {
      hasSuccessfullyLoaded = true;
      console.log('Audio data loaded');
    });

    audio.addEventListener('error', handleAudioError);
    
    // Add a timeout to detect if the audio never loads
    const loadTimeout = setTimeout(() => {
      if (!hasSuccessfullyLoaded && !hasReportedError) {
        console.warn(`Audio loading timeout for file: ${audioFile.name}. This may indicate a corrupted file or unsupported format.`);
      }
    }, 5000);
    
    // Set initial playback speed if enabled
    if (speedControlEnabled) {
      audio.playbackRate = speedValue;
    }

    // Create Audio Context and Web Audio nodes
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContext();
    } catch {
      // @ts-expect-error: Safari/WebKit compatibility
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContextRef.current = audioContext;
    
    const sourceNode = audioContext.createMediaElementSource(audio);
    sourceNodeRef.current = sourceNode;
    
    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;

    // Create analyser input node (unity gain, just for tapping audio)
    const analyserInputNode = audioContext.createGain();
    analyserInputNode.gain.value = 1;
    analyserInputNodeRef.current = analyserInputNode;

    const pitchShifter = new PitchShifter(audioContext);
    pitchShifterRef.current = pitchShifter;
    
    const bassBoostNode = audioContext.createBiquadFilter();
    bassBoostNode.type = 'lowshelf';
    bassBoostNode.frequency.value = 150;
    bassBoostNode.gain.value = bassBoostEnabled ? bassBoostAmount : 0;
    bassBoostNodeRef.current = bassBoostNode;
    

    
    // Basic connections (we'll handle the routing in another effect)
    sourceNode.connect(gainNode);
    sourceNode.connect(analyserInputNode); // Connect to analyser input node
    
    // Initialize pitch shifter
    pitchShifter.setActive(pitchShiftEnabled);

    const onMetadata = () => {
      setDuration(audio.duration);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setSeekValue((audio.currentTime / audio.duration) * 100);
    };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      clearTimeout(loadTimeout);
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('error', handleAudioError);
      URL.revokeObjectURL(url);
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (pitchShifterRef.current) {
        pitchShifterRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioFile]); // Only depend on audioFile, not the control states

  // Handle dynamic routing of audio nodes when effects are toggled
  useEffect(() => {
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const pitchShifter = pitchShifterRef.current;
    const bassBoostNode = bassBoostNodeRef.current;
    const sourceNode = sourceNodeRef.current;

    if (!audioContext || !gainNode || !pitchShifter || !bassBoostNode || !sourceNode) return;

    // Update pitch shifter active state to prevent audio interruption
    pitchShifter.setActive(pitchShiftEnabled);

    // Safer disconnection of nodes
    try {
      gainNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }

    try {
      bassBoostNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }

    // Connect source to gain node first (always needed)
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore disconnection errors
      }
      sourceNodeRef.current.connect(gainNode);
    }

    // Build the main signal chain - always include pitch shifter with active/inactive state
    if (bassBoostEnabled) {
      // Bass boost enabled
      gainNode.connect(bassBoostNode);
      bassBoostNode.connect(pitchShifter.inputNode);
      pitchShifter.connect(audioContext.destination);
    } else {
      // No bass boost
      gainNode.connect(pitchShifter.inputNode);
      pitchShifter.connect(audioContext.destination);
    }

  }, [bassBoostEnabled, pitchShiftEnabled]);

  // Handle pitch shifter changes without reconfiguring audio graph
  useEffect(() => {
    if (pitchShifterRef.current) {
      pitchShifterRef.current.setActive(pitchShiftEnabled);
      pitchShifterRef.current.setPitchShift(pitchValue);
    }
  }, [pitchShiftEnabled, pitchValue]);

  // Handle speed control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (speedControlEnabled) {
      audio.playbackRate = speedValue;
    } else {
      audio.playbackRate = 1.0;
    }
  }, [speedControlEnabled, speedValue]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  

  
  useEffect(() => {
    if (bassBoostNodeRef.current) {
      bassBoostNodeRef.current.gain.value = bassBoostEnabled ? bassBoostAmount : 0;
    }
  }, [bassBoostEnabled, bassBoostAmount]);

  // Check for unsaved changes whenever effects settings change
  const checkForUnsavedChanges = useCallback(() => {
    let hasChanges = false;
    
    if (!loadedProject || !originalEffectsSettings) {
      // For new projects, consider any active effects as changes
      hasChanges = hasActiveEffects();
    } else {
      const currentSettings = getCurrentEffectsSettings();
      
      // Helper function to compare floating point numbers with small tolerance
      const isFloatEqual = (a: number, b: number, tolerance = 0.001) => {
        return Math.abs(a - b) < tolerance;
      };
      
      // Compare current settings with original loaded settings
      // Since both are now normalized to the same structure, we can safely compare
      const bassEnabledChanged = currentSettings.bass_boost!.enabled !== originalEffectsSettings.bass_boost!.enabled;
      const bassAmountChanged = currentSettings.bass_boost!.amount !== originalEffectsSettings.bass_boost!.amount;
      const speedEnabledChanged = currentSettings.speed_control!.enabled !== originalEffectsSettings.speed_control!.enabled;
      const speedValueChanged = !isFloatEqual(currentSettings.speed_control!.speed, originalEffectsSettings.speed_control!.speed);
      const pitchEnabledChanged = currentSettings.pitch_shift!.enabled !== originalEffectsSettings.pitch_shift!.enabled;
      const pitchValueChanged = currentSettings.pitch_shift!.semitones !== originalEffectsSettings.pitch_shift!.semitones;
      const volumeChanged = !isFloatEqual(currentSettings.volume!.level, originalEffectsSettings.volume!.level);
      
      hasChanges = (
        bassEnabledChanged ||
        bassAmountChanged ||
        speedEnabledChanged ||
        speedValueChanged ||
        pitchEnabledChanged ||
        pitchValueChanged ||
        volumeChanged
      );
    }

    setHasUnsavedChanges(hasChanges);
    onUnsavedChangesChange?.(hasChanges);
  }, [bassBoostEnabled, bassBoostAmount, speedControlEnabled, speedValue, pitchShiftEnabled, pitchValue, volume, loadedProject, originalEffectsSettings, onUnsavedChangesChange]);

  useEffect(() => {
    checkForUnsavedChanges();
  }, [checkForUnsavedChanges]);

  // Handle external trigger to open save dialog
  useEffect(() => {
    if (triggerSaveDialog) {
      setShowSaveDialog(true);
    }
  }, [triggerSaveDialog]);



  // Apply loaded project settings
  useEffect(() => {
    if (loadedProject) {
      const settings = loadedProject.effects_settings;
      
              // Apply settings and capture what we actually set as the component state
        // This ensures perfect alignment between applied state and stored original state
        
        // Bass boost settings
        const appliedBassEnabled = settings.bass_boost?.enabled || false;
        const appliedBassAmount = settings.bass_boost?.amount || 6;
        setBassBoostEnabled(appliedBassEnabled);
        setBassBoostAmount(appliedBassAmount);
        
        // Speed control settings  
        const appliedSpeedEnabled = settings.speed_control?.enabled || false;
        const appliedSpeedValue = settings.speed_control?.speed || 1.0;
        setSpeedControlEnabled(appliedSpeedEnabled);
        setSpeedValue(appliedSpeedValue);
        
        // Pitch shift settings
        const appliedPitchEnabled = settings.pitch_shift?.enabled || false;
        const appliedPitchValue = settings.pitch_shift?.semitones || 0;
        setPitchShiftEnabled(appliedPitchEnabled);
        setPitchValue(appliedPitchValue);
        
        // Volume settings
        const appliedVolume = settings.volume?.level || 0.75;
        setVolume(appliedVolume);

        // Set project name and store original settings for comparison
        setProjectName(loadedProject.project_name);
        
        // Store the exact values we just applied as the original settings
        // This guarantees perfect alignment with the component state
        const normalizedOriginalSettings: AudioEffectsSettings = {
          bass_boost: {
            enabled: appliedBassEnabled,
            amount: appliedBassAmount
          },
          speed_control: {
            enabled: appliedSpeedEnabled,
            speed: appliedSpeedValue
          },
          pitch_shift: {
            enabled: appliedPitchEnabled,
            semitones: appliedPitchValue
          },
          volume: {
            level: appliedVolume
          }
        };
        setOriginalEffectsSettings(normalizedOriginalSettings);
      
      // Don't show "saved successfully" message for loaded projects
      // Only set savedProjectId without triggering success message
      setHasUnsavedChanges(false);
    } else {
      // Reset state for new projects
      setOriginalEffectsSettings(null);
      setHasUnsavedChanges(false);
    }
  }, [loadedProject]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      onPlayingChange?.(false);
    } else {
      audio.play();
      setIsPlaying(true);
      onPlayingChange?.(true);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!visualizationRef.current || !audioRef.current || duration === 0) return;

    const rect = visualizationRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    
    setSeekValue(percentage);
    const time = (percentage / 100) * duration;
    if (isFinite(time)) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleSeekMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    handleSeek(e);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSeeking) {
      handleSeek(e);
    }
  };

  const handleSeekMouseUp = () => {
    setIsSeeking(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsSeeking(true);
    handleSeek(e);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isSeeking) {
      handleSeek(e);
    }
  };

  const handleTouchEnd = () => {
    setIsSeeking(false);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const resetAllEffects = () => {
    setPitchShiftEnabled(false);
    setSpeedControlEnabled(false);
    setBassBoostEnabled(false);
    setPitchValue(0);
    setSpeedValue(1.0);
    setBassBoostAmount(6);
  };

  const resetToProjectDefaults = () => {
    if (!originalEffectsSettings) return;
    setBassBoostEnabled(originalEffectsSettings.bass_boost?.enabled ?? false);
    setBassBoostAmount(originalEffectsSettings.bass_boost?.amount ?? 6);
    setSpeedControlEnabled(originalEffectsSettings.speed_control?.enabled ?? false);
    setSpeedValue(originalEffectsSettings.speed_control?.speed ?? 1.0);
    setPitchShiftEnabled(originalEffectsSettings.pitch_shift?.enabled ?? false);
    setPitchValue(originalEffectsSettings.pitch_shift?.semitones ?? 0);
    setVolume(originalEffectsSettings.volume?.level ?? 0.75);
  };

  const handleTogglePitchShift = () => {
    const isNowEnabled = !pitchShiftEnabled;
    setPitchShiftEnabled(isNowEnabled);
    if (isNowEnabled) {
      setPitchValue(0);
    }
  };

  const handleToggleSpeedControl = () => {
    const isNowEnabled = !speedControlEnabled;
    setSpeedControlEnabled(isNowEnabled);
    if (isNowEnabled) {
      setSpeedValue(1.0);
    }
  };

  const handleToggleBassBoost = () => {
    const isNowEnabled = !bassBoostEnabled;
    setBassBoostEnabled(isNowEnabled);
    if (isNowEnabled) {
      setBassBoostAmount(6);
    }
  };

  const getCurrentEffectsSettings = (): AudioEffectsSettings => {
    return {
      bass_boost: {
        enabled: bassBoostEnabled,
        amount: bassBoostAmount
      },
      speed_control: {
        enabled: speedControlEnabled,
        speed: speedValue
      },
      pitch_shift: {
        enabled: pitchShiftEnabled,
        semitones: pitchValue
      },
      volume: {
        level: volume
      }
    };
  };

  

  const handleSaveComplete = (projectId: string, wasUpdate: boolean = false) => {
    onSaveComplete(projectId);
    setHasUnsavedChanges(false);
    
    // Update original settings to current settings after successful save
    // This ensures future comparisons are against the newly saved state
    const currentSettings = getCurrentEffectsSettings();
    setOriginalEffectsSettings(currentSettings);
    
    // If this save was triggered by navigation, call the navigation callback
    if (triggerSaveDialog && onSaveCompleteWithNavigation) {
      onSaveCompleteWithNavigation(projectId);
    }
    // If this was an update to an existing project, redirect to dashboard immediately
    else if (wasUpdate && onProjectUpdated) {
      onProjectUpdated(projectId);
    }
    // If this was a copy (new project from existing), redirect to the copy
    else if (!wasUpdate && loadedProject && onProjectCopied) {
      onProjectCopied(projectId);
    }
    

  };

  const hasActiveEffects = () => {
    return bassBoostEnabled || speedControlEnabled || pitchShiftEnabled || volume !== 0.75;
  };

  // Memoize the existingProject object to prevent unnecessary re-renders
  const existingProjectForDialog = useMemo(() => {
    return loadedProject ? {
      id: loadedProject.id,
      project_name: loadedProject.project_name
    } : null;
  }, [loadedProject]);



  return (
    <div className="w-full space-y-6">
      {/* Main Player Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            {projectName ? `${projectName}` : 'Audio Player'}
          </CardTitle>
          {projectName && (
            <p className="text-sm text-muted-foreground">
              Loaded project • {audioFile.name}
            </p>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Waveform Visualization */}
          <div 
            ref={visualizationRef}
            className="relative w-full h-16 bg-muted rounded-lg overflow-hidden cursor-pointer"
            onMouseDown={handleSeekMouseDown}
            onMouseMove={handleSeekMouseMove}
            onMouseUp={handleSeekMouseUp}
            onMouseLeave={handleSeekMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="absolute top-0 left-0 h-full bg-primary opacity-30"
              style={{ width: `${seekValue}%`, pointerEvents: 'none' }}
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <Button
              onClick={togglePlay}
              size="lg"
              className="w-12 h-12 rounded-full p-0"
            >
              {isPlaying ? (
                <Pause className="h-6 w-6" />
              ) : (
                <Play className="h-6 w-6" />
              )}
            </Button>

            <div className="flex items-center gap-3 flex-1 ml-4">
              <Volume2 className="h-4 w-4 text-muted-foreground" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-muted rounded-full appearance-none cursor-pointer"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Effects Panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Audio Effects
          </CardTitle>
          <div className="flex items-center gap-2">
            {loadedProject && (
              <Button
                onClick={resetToProjectDefaults}
                variant="outline"
                size="sm"
                disabled={!hasUnsavedChanges}
                className={`${!hasUnsavedChanges ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <Undo2 className="h-4 w-4 mr-2" />
                Reset to project defaults
              </Button>
            )}
            <Button
              onClick={resetAllEffects}
              variant="outline"
              size="sm"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Pitch Shift Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                Pitch Shift
                {pitchShiftEnabled && <Badge variant="secondary">ON</Badge>}
              </label>
              <Button
                variant={pitchShiftEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleTogglePitchShift}
              >
                {pitchShiftEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            
            <AnimatePresence>
              {pitchShiftEnabled && (
                <motion.div
                  key="pitch-shift-controls"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>-12</span>
                      <span>0</span>
                      <span>+12</span>
                    </div>
                    <input
                      type="range"
                      min={-12}
                      max={12}
                      step={1}
                      value={pitchValue}
                      onChange={(e) => setPitchValue(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                    />
                    <div className="text-center text-xs text-muted-foreground">
                      Current: {pitchValue > 0 ? '+' : ''}{pitchValue} semitones
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Speed Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                Speed Control
                {speedControlEnabled && <Badge variant="secondary">ON</Badge>}
              </label>
              <Button
                variant={speedControlEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleSpeedControl}
              >
                {speedControlEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            
            <AnimatePresence>
              {speedControlEnabled && (
                <motion.div
                  key="speed-control-controls"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0.5x</span>
                      <span>1x</span>
                      <span>1.5x</span>
                    </div>
                    <div className="relative">
                      <input
                        type="range"
                        min={0.5}
                        max={1.5}
                        step={0.1}
                        value={speedValue}
                        onChange={(e) => setSpeedValue(parseFloat(e.target.value))}
                        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                      />
                      <div
                        className="absolute top-1/2 w-0.5 h-3 bg-border -translate-y-1/2 pointer-events-none"
                        style={{ left: '50%' }}
                      />
                    </div>
                    <div className="text-center text-xs text-muted-foreground">
                      Current: {speedValue.toFixed(1)}x
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bass Boost Control */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                Bass Boost
                {bassBoostEnabled && <Badge variant="secondary">ON</Badge>}
              </label>
              <Button
                variant={bassBoostEnabled ? "default" : "outline"}
                size="sm"
                onClick={handleToggleBassBoost}
              >
                {bassBoostEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            
            <AnimatePresence>
              {bassBoostEnabled && (
                <motion.div
                  key="bass-boost-controls"
                  initial="collapsed"
                  animate="open"
                  exit="collapsed"
                  variants={{
                    open: { opacity: 1, height: 'auto' },
                    collapsed: { opacity: 0, height: 0 },
                  }}
                  transition={{ duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] }}
                  className="overflow-hidden"
                >
                  <div className="space-y-2 pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>0 dB</span>
                      <span>10 dB</span>
                      <span>20 dB</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={20}
                      step={1}
                      value={bassBoostAmount}
                      onChange={(e) => setBassBoostAmount(parseFloat(e.target.value))}
                      className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer"
                    />
                    <div className="text-center text-xs text-muted-foreground">
                      Boost: {bassBoostAmount} dB
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

        </CardContent>
      </Card>

      {/* Save Project Dialog */}
      <SaveProjectDialog
        isOpen={showSaveDialog}
        onClose={() => {
          setShowSaveDialog(false);
          onSaveDialogClose?.();
        }}
        audioFile={audioFile}
        effectsSettings={getCurrentEffectsSettings()}
        onSaveComplete={handleSaveComplete}
        existingProject={existingProjectForDialog}
      />
    </div>
  );
};

export default AudioPlayer;