import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import { Suspense, useRef } from 'react';
import * as THREE from 'three';
import { AudioFeatures, VisualizationSettings } from './types';
import { WaveformSphere } from './WaveformSphere';
import { ParticleEmitter } from './ParticleEmitter';
import { DynamicLighting } from './DynamicLighting';

interface VisualizationSceneProps {
  audioFeatures: AudioFeatures;
  currentVisualization: string;
  settings?: VisualizationSettings;
  className?: string;
}

export const VisualizationScene: React.FC<VisualizationSceneProps> = ({
  audioFeatures,
  currentVisualization,
  settings = {
    sensitivity: 1,
    smoothing: 0.8,
    colorScheme: 'rainbow',
    quality: 'high',
    deformationIntensity: 0.7,
    particleIntensity: 0.5,
    glowIntensity: 0.6
  },
  className = "w-full h-full"
}) => {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null!);

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

          {/* Dynamic Lighting System */}
          <DynamicLighting audioFeatures={audioFeatures} quality={settings.quality} />

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
            settings={settings}
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
  settings: VisualizationSettings;
}> = ({ audioFeatures, visualization, settings }) => {
  return (
    <>
      <WaveformSphere audioFeatures={audioFeatures} settings={settings} />
      {settings.particleIntensity > 0 && (
        <ParticleEmitter 
          audioFeatures={audioFeatures} 
          particleIntensity={settings.particleIntensity}
          quality={settings.quality}
        />
      )}
    </>
  );
};



