# Studio Audio Visualization - Phase 1: Foundation Implementation

## Overview
This guide provides step-by-step instructions for implementing the first phase of the audio-reactive 3D visualization system integrated with your existing `/studio` infrastructure.

## Prerequisites
- Existing studio components in `/components/studio/`
- Audio processing system with AudioPlayer and AudioUploader
- React Three Fiber, Drei, Framer Motion already installed
- Web Audio API integration in place

## Phase 1 Objectives
1. Create AudioAnalyzer component for real-time audio data extraction
2. Set up VisualizationScene as the main 3D container
3. Implement FrequencyBars as the first visualization
4. Integrate with existing studio page and components
5. Add basic visualization controls

---

## Step 1: Create AudioAnalyzer Component

**File**: `components/visualization/AudioAnalyzer.tsx`

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';
import * as Tone from 'tone';

export interface AudioFeatures {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  beatIntensity: number;
  spectralCentroid: number;
  rms: number;
  dominantFrequency: number;
  isPlaying: boolean;
}

interface AudioAnalyzerProps {
  audioContext: AudioContext | null;
  sourceNode: MediaElementAudioSourceNode | null;
  isPlaying: boolean;
  onFeaturesUpdate: (features: AudioFeatures) => void;
}

export const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({
  audioContext,
  sourceNode,
  isPlaying,
  onFeaturesUpdate
}) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize analyser node
  useEffect(() => {
    if (!audioContext || !sourceNode) {
      setIsInitialized(false);
      return;
    }

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    sourceNode.connect(analyser);
    analyserRef.current = analyser;
    setIsInitialized(true);

    return () => {
      if (analyserRef.current) {
        sourceNode.disconnect(analyserRef.current);
        analyserRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [audioContext, sourceNode]);

  // Audio analysis loop
  const analyze = useCallback(() => {
    if (!analyserRef.current || !isInitialized) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;

    // Frequency domain data
    const frequencyData = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(frequencyData);

    // Time domain data
    const timeData = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(timeData);

    // Calculate audio features
    const rms = calculateRMS(timeData);
    const spectralCentroid = calculateSpectralCentroid(frequencyData);
    const dominantFrequency = findDominantFrequency(frequencyData);
    const beatIntensity = calculateBeatIntensity(frequencyData);

    const features: AudioFeatures = {
      frequencyData,
      timeData,
      beatIntensity,
      spectralCentroid,
      rms,
      dominantFrequency,
      isPlaying
    };

    onFeaturesUpdate(features);

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(analyze);
    }
  }, [isInitialized, isPlaying, onFeaturesUpdate]);

  // Start/stop analysis
  useEffect(() => {
    if (isPlaying && isInitialized) {
      analyze();
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, isInitialized, analyze]);

  return null; // This is a logic-only component
};

// Helper functions for audio feature extraction
function calculateRMS(data: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const sample = (data[i] - 128) / 128;
    sum += sample * sample;
  }
  return Math.sqrt(sum / data.length);
}

function calculateSpectralCentroid(frequencyData: Uint8Array): number {
  let weightedSum = 0;
  let total = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    const magnitude = frequencyData[i];
    weightedSum += i * magnitude;
    total += magnitude;
  }

  return total > 0 ? weightedSum / total : 0;
}

function findDominantFrequency(frequencyData: Uint8Array): number {
  let maxIndex = 0;
  let maxValue = 0;

  for (let i = 0; i < frequencyData.length; i++) {
    if (frequencyData[i] > maxValue) {
      maxValue = frequencyData[i];
      maxIndex = i;
    }
  }

  // Convert bin index to frequency (assuming 44.1kHz sample rate)
  return (maxIndex * 44100) / (2 * frequencyData.length);
}

function calculateBeatIntensity(frequencyData: Uint8Array): number {
  // Focus on bass frequencies (bins 0-10) for beat detection
  let sum = 0;
  const bassRange = Math.min(10, frequencyData.length);

  for (let i = 0; i < bassRange; i++) {
    sum += frequencyData[i];
  }

  return sum / (bassRange * 255); // Normalize to 0-1
}
```

---

## Step 2: Create VisualizationScene Component

**File**: `components/visualization/VisualizationScene.tsx`

```typescript
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import { AudioFeatures } from './AudioAnalyzer';

interface VisualizationSceneProps {
  audioFeatures: AudioFeatures;
  currentVisualization: string;
  className?: string;
}

export const VisualizationScene: React.FC<VisualizationSceneProps> = ({
  audioFeatures,
  currentVisualization,
  className = "w-full h-full"
}) => {
  const cameraRef = useRef<any>();

  return (
    <div className={className}>
      <Canvas
        shadows
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Suspense fallback={null}>
          {/* Camera setup */}
          <PerspectiveCamera
            ref={cameraRef}
            makeDefault
            position={[0, 0, 10]}
            fov={60}
          />

          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />

          {/* Environment */}
          <Environment preset="night" />

          {/* Camera controls */}
          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            maxDistance={50}
            minDistance={2}
          />

          {/* Render current visualization */}
          <VisualizationRenderer
            audioFeatures={audioFeatures}
            visualization={currentVisualization}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

// Component to render the active visualization
const VisualizationRenderer: React.FC<{
  audioFeatures: AudioFeatures;
  visualization: string;
}> = ({ audioFeatures, visualization }) => {
  switch (visualization) {
    case 'bars':
      return <FrequencyBars audioFeatures={audioFeatures} />;
    case 'sphere':
      return <WaveformSphere audioFeatures={audioFeatures} />;
    case 'particles':
      return <ParticleSystem audioFeatures={audioFeatures} />;
    default:
      return <FrequencyBars audioFeatures={audioFeatures} />;
  }
};

// Placeholder components for now - we'll implement these next
const FrequencyBars: React.FC<{ audioFeatures: AudioFeatures }> = ({ audioFeatures }) => {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="blue" />
    </mesh>
  );
};

const WaveformSphere: React.FC<{ audioFeatures: AudioFeatures }> = ({ audioFeatures }) => {
  return (
    <mesh>
      <sphereGeometry args={[2, 32, 32]} />
      <meshStandardMaterial color="red" />
    </mesh>
  );
};

const ParticleSystem: React.FC<{ audioFeatures: AudioFeatures }> = ({ audioFeatures }) => {
  return (
    <mesh>
      <sphereGeometry args={[0.1, 8, 8]} />
      <meshStandardMaterial color="green" />
    </mesh>
  );
};
```

---

## Step 3: Create FrequencyBars Visualization

**File**: `components/visualization/FrequencyBars.tsx`

```typescript
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { InstancedMesh, Object3D, Color } from 'three';
import { AudioFeatures } from './AudioAnalyzer';

interface FrequencyBarsProps {
  audioFeatures: AudioFeatures;
  barCount?: number;
  maxHeight?: number;
  spacing?: number;
}

export const FrequencyBars: React.FC<FrequencyBarsProps> = ({
  audioFeatures,
  barCount = 64,
  maxHeight = 8,
  spacing = 0.3
}) => {
  const meshRef = useRef<InstancedMesh>(null);
  const tempObject = useMemo(() => new Object3D(), []);

  // Create colors for frequency ranges
  const colors = useMemo(() => {
    const colorArray = [];
    for (let i = 0; i < barCount; i++) {
      // Create a gradient from red (low freq) to blue (high freq)
      const hue = (i / barCount) * 0.7; // 0.7 = blue to red range
      colorArray.push(new Color().setHSL(hue, 0.8, 0.5));
    }
    return colorArray;
  }, [barCount]);

  useFrame(() => {
    if (!meshRef.current || !audioFeatures.frequencyData) return;

    const mesh = meshRef.current;
    const data = audioFeatures.frequencyData;
    const step = Math.floor(data.length / barCount);

    for (let i = 0; i < barCount; i++) {
      const frequencyIndex = i * step;
      const amplitude = data[frequencyIndex] / 255; // Normalize to 0-1
      const height = amplitude * maxHeight;

      // Position bars in a line
      const x = (i - barCount / 2) * spacing;
      const y = height / 2;
      const z = 0;

      tempObject.position.set(x, y, z);
      tempObject.scale.set(0.2, height, 0.2);
      tempObject.updateMatrix();

      mesh.setMatrixAt(i, tempObject.matrix);
      mesh.setColorAt(i, colors[i]);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, barCount]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial />
    </instancedMesh>
  );
};
```

---

## Step 4: Update FrequencyBars in VisualizationScene

**Update**: `components/visualization/VisualizationScene.tsx`

Replace the placeholder FrequencyBars with the actual import:

```typescript
// Add this import at the top
import { FrequencyBars } from './FrequencyBars';

// Replace the placeholder FrequencyBars component with:
const FrequencyBarsRenderer: React.FC<{ audioFeatures: AudioFeatures }> = ({ audioFeatures }) => {
  return <FrequencyBars audioFeatures={audioFeatures} />;
};
```

---

## Step 5: Create Visualization Types

**File**: `components/visualization/types.ts`

```typescript
export interface AudioFeatures {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  beatIntensity: number;
  spectralCentroid: number;
  rms: number;
  dominantFrequency: number;
  isPlaying: boolean;
}

export type VisualizationType = 'bars' | 'sphere' | 'particles' | 'tunnel' | 'lattice' | 'liquid';

export interface VisualizationSettings {
  sensitivity: number; // 0-2, how responsive the viz is to audio
  smoothing: number;   // 0-1, how smooth the animations are
  colorScheme: 'rainbow' | 'fire' | 'ocean' | 'neon';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  barCount: number;    // for frequency bars
}

export interface StudioVisualizationState {
  currentVisualization: VisualizationType;
  audioFeatures: AudioFeatures | null;
  settings: VisualizationSettings;
  isActive: boolean;
}
```

---

## Step 6: Create Visualization Controls Component

**File**: `components/visualization/VisualizationControls.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider'; // You'll need to create this
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisualizationType, VisualizationSettings } from './types';
import { Monitor, Settings, BarChart3, Circle, Sparkles, Eye } from 'lucide-react';

interface VisualizationControlsProps {
  currentVisualization: VisualizationType;
  settings: VisualizationSettings;
  onVisualizationChange: (type: VisualizationType) => void;
  onSettingsChange: (settings: Partial<VisualizationSettings>) => void;
  isActive: boolean;
}

const visualizationOptions = [
  { id: 'bars' as const, name: 'Frequency Bars', icon: BarChart3, description: 'Classic spectrum analyzer' },
  { id: 'sphere' as const, name: 'Wave Sphere', icon: Circle, description: '3D waveform sphere' },
  { id: 'particles' as const, name: 'Particle Storm', icon: Sparkles, description: 'Dynamic particles' },
  { id: 'tunnel' as const, name: 'Tunnel', icon: Eye, description: 'Spectrogram tunnel' },
];

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  currentVisualization,
  settings,
  onVisualizationChange,
  onSettingsChange,
  isActive
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Audio Visualization
          {isActive && <Badge variant="secondary">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visualization Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Visualization Type</label>
          <div className="grid grid-cols-2 gap-2">
            {visualizationOptions.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  key={option.id}
                  variant={currentVisualization === option.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => onVisualizationChange(option.id)}
                  className="flex flex-col items-center gap-1 h-auto p-3"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{option.name}</span>
                </Button>
              );
            })}
          </div>
        </div>

        {/* Sensitivity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Sensitivity: {settings.sensitivity.toFixed(1)}x</label>
          <Slider
            value={[settings.sensitivity]}
            onValueChange={(value) => onSettingsChange({ sensitivity: value[0] })}
            min={0.1}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Smoothing Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Smoothing: {(settings.smoothing * 100).toFixed(0)}%</label>
          <Slider
            value={[settings.smoothing]}
            onValueChange={(value) => onSettingsChange({ smoothing: value[0] })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Color Scheme Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Color Scheme</label>
          <Select
            value={settings.colorScheme}
            onValueChange={(value: any) => onSettingsChange({ colorScheme: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rainbow">Rainbow</SelectItem>
              <SelectItem value="fire">Fire</SelectItem>
              <SelectItem value="ocean">Ocean</SelectItem>
              <SelectItem value="neon">Neon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quality</label>
          <Select
            value={settings.quality}
            onValueChange={(value: any) => onSettingsChange({ quality: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Mobile)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="ultra">Ultra</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};
```

---

## Step 7: Integrate with Studio Page

**File**: `app/studio/page.tsx`

```typescript
'use client';

import { useState, useRef } from 'react';
import { AudioUploader } from '@/components/studio/AudioUploader';
import { AudioPlayer } from '@/components/studio/AudioPlayer';
import { VisualizationScene } from '@/components/visualization/VisualizationScene';
import { VisualizationControls } from '@/components/visualization/VisualizationControls';
import { AudioAnalyzer, AudioFeatures } from '@/components/visualization/AudioAnalyzer';
import { VisualizationType, VisualizationSettings, StudioVisualizationState } from '@/components/visualization/types';
import * as Tone from 'tone';

const defaultSettings: VisualizationSettings = {
  sensitivity: 1,
  smoothing: 0.8,
  colorScheme: 'rainbow',
  quality: 'high',
  barCount: 64
};

export default function StudioPage() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFeatures, setAudioFeatures] = useState<AudioFeatures | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const [visualizationState, setVisualizationState] = useState<StudioVisualizationState>({
    currentVisualization: 'bars',
    audioFeatures: null,
    settings: defaultSettings,
    isActive: false
  });

  // Audio context refs (these will be passed to AudioPlayer and AudioAnalyzer)
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);

  const handleAudioLoaded = (buffer: Tone.ToneAudioBuffer | null, file: File) => {
    setAudioFile(file);
    setVisualizationState(prev => ({ ...prev, isActive: true }));
  };

  const handleAudioFeaturesUpdate = (features: AudioFeatures) => {
    setAudioFeatures(features);
    setVisualizationState(prev => ({ ...prev, audioFeatures: features }));
  };

  const handleVisualizationChange = (type: VisualizationType) => {
    setVisualizationState(prev => ({ ...prev, currentVisualization: type }));
  };

  const handleSettingsChange = (newSettings: Partial<VisualizationSettings>) => {
    setVisualizationState(prev => ({
      ...prev,
      settings: { ...prev.settings, ...newSettings }
    }));
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Audio Studio</h1>
          <p className="text-muted-foreground">Create, process, and visualize your audio</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Audio Controls */}
          <div className="lg:col-span-1 space-y-6">
            {!audioFile ? (
              <AudioUploader onAudioLoaded={handleAudioLoaded} />
            ) : (
              <div className="space-y-6">
                <AudioPlayer
                  audioFile={audioFile}
                  onPlayingChange={setIsPlaying}
                  audioContextRef={audioContextRef}
                  sourceNodeRef={sourceNodeRef}
                />

                <VisualizationControls
                  currentVisualization={visualizationState.currentVisualization}
                  settings={visualizationState.settings}
                  onVisualizationChange={handleVisualizationChange}
                  onSettingsChange={handleSettingsChange}
                  isActive={visualizationState.isActive}
                />
              </div>
            )}
          </div>

          {/* Right Column - 3D Visualization */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-lg border p-4">
              <h2 className="text-xl font-semibold mb-4">3D Audio Visualization</h2>

              {visualizationState.isActive && audioFeatures ? (
                <div className="relative w-full h-96 lg:h-[600px]">
                  <VisualizationScene
                    audioFeatures={audioFeatures}
                    currentVisualization={visualizationState.currentVisualization}
                    className="w-full h-full rounded-lg overflow-hidden"
                  />

                  {/* Audio Analyzer (invisible component) */}
                  <AudioAnalyzer
                    audioContext={audioContextRef.current}
                    sourceNode={sourceNodeRef.current}
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
        </div>
      </div>
    </div>
  );
}
```

---

## Step 8: Update AudioPlayer to Support Visualization Integration

**File**: `components/studio/AudioPlayer.tsx`

Add these props and refs to the AudioPlayer component:

```typescript
interface AudioPlayerProps {
  audioFile: File;
  onPlayingChange?: (isPlaying: boolean) => void;
  audioContextRef?: React.MutableRefObject<AudioContext | null>;
  sourceNodeRef?: React.MutableRefObject<MediaElementAudioSourceNode | null>;
}

// In the component, update the refs:
const AudioPlayer = ({
  audioFile,
  onPlayingChange,
  audioContextRef: externalAudioContextRef,
  sourceNodeRef: externalSourceNodeRef
}: AudioPlayerProps) => {
  // ... existing code ...

  // Update the refs to use external refs if provided
  const audioContextRef = externalAudioContextRef || useRef<AudioContext | null>(null);
  const sourceNodeRef = externalSourceNodeRef || useRef<MediaElementAudioSourceNode | null>(null);

  // ... existing code ...

  // Update play/pause handlers to notify parent
  const togglePlay = () => {
    // ... existing code ...
    onPlayingChange?.(isPlaying);
  };

  // ... rest of existing code ...
};
```

---

## Step 9: Create Missing UI Components

**File**: `components/ui/slider.tsx`

```typescript
import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute h-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
```

---

## Next Steps

After implementing these components:

1. **Test the Foundation**: Verify that FrequencyBars appear and respond to audio
2. **Add More Visualizations**: Implement WaveformSphere and ParticleSystem
3. **Enhance Controls**: Add more settings and visualization options
4. **Performance Optimization**: Implement LOD and object pooling
5. **Mobile Support**: Add responsive design for mobile devices

This Phase 1 implementation provides a solid foundation for the audio visualization system while maintaining compatibility with your existing studio infrastructure.

## Files Created/Modified in Phase 1:
- ✅ `components/visualization/AudioAnalyzer.tsx` (NEW)
- ✅ `components/visualization/VisualizationScene.tsx` (NEW)
- ✅ `components/visualization/FrequencyBars.tsx` (NEW)
- ✅ `components/visualization/types.ts` (NEW)
- ✅ `components/visualization/VisualizationControls.tsx` (NEW)
- ✅ `app/studio/page.tsx` (MODIFIED)
- ✅ `components/studio/AudioPlayer.tsx` (MODIFIED)
- ✅ `components/ui/slider.tsx` (NEW)
