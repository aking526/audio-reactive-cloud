import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioFeatures } from './types';

interface DynamicLightingProps {
  audioFeatures: AudioFeatures;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

export const DynamicLighting: React.FC<DynamicLightingProps> = ({ audioFeatures, quality }) => {
  const light1Ref = useRef<THREE.PointLight>(null);
  const light2Ref = useRef<THREE.PointLight>(null);
  const light3Ref = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);
  
  useFrame((state) => {
    if (!audioFeatures) return;
    
    const time = state.clock.elapsedTime;
    const { beatIntensity, spectralCentroid, rms, frequencyBands, dominantFrequency } = audioFeatures;
    
    // Dynamic point lights orbiting the sphere
    if (light1Ref.current) {
      // Orbit based on dominant frequency
      const radius = 5 + frequencyBands.low * 3;
      const speed = 0.5 + dominantFrequency / 10000;
      light1Ref.current.position.x = Math.cos(time * speed) * radius;
      light1Ref.current.position.z = Math.sin(time * speed) * radius;
      light1Ref.current.position.y = Math.sin(time * 0.3) * 2;
      
      // Color based on low frequencies
      const hue = frequencyBands.low;
      light1Ref.current.color.setHSL(hue, 0.8, 0.6);
      light1Ref.current.intensity = 0.5 + frequencyBands.low * 2;
    }
    
    if (light2Ref.current && quality !== 'low') {
      // Counter-orbit for light 2
      const radius = 4 + frequencyBands.mid * 2;
      const speed = 0.7 + spectralCentroid / 5000;
      light2Ref.current.position.x = Math.cos(time * speed + Math.PI) * radius;
      light2Ref.current.position.z = Math.sin(time * speed + Math.PI) * radius;
      light2Ref.current.position.y = Math.cos(time * 0.4) * 2;
      
      // Color based on mid frequencies
      const hue = 0.3 + frequencyBands.mid * 0.4;
      light2Ref.current.color.setHSL(hue, 0.7, 0.5);
      light2Ref.current.intensity = 0.3 + frequencyBands.mid * 1.5;
    }
    
    if (light3Ref.current && (quality === 'high' || quality === 'ultra')) {
      // Vertical movement for light 3
      const radius = 3;
      light3Ref.current.position.x = Math.sin(time * 0.8) * radius;
      light3Ref.current.position.y = 3 + Math.sin(time * 1.2) * 2;
      light3Ref.current.position.z = Math.cos(time * 0.8) * radius;
      
      // Color based on high frequencies
      const hue = 0.6 + frequencyBands.high * 0.3;
      light3Ref.current.color.setHSL(hue, 0.9, 0.7);
      light3Ref.current.intensity = 0.2 + frequencyBands.high * 1;
    }
    
    // Beat-reactive spotlight
    if (spotLightRef.current && quality !== 'low') {
      // Pulse intensity with beat
      spotLightRef.current.intensity = 0.5 + beatIntensity * 2;
      
      // Move spotlight target based on RMS
      const targetX = (Math.random() - 0.5) * rms * 5;
      const targetZ = (Math.random() - 0.5) * rms * 5;
      spotLightRef.current.target.position.lerp(
        new THREE.Vector3(targetX, 0, targetZ),
        0.1
      );
      
      // Color shift based on energy flux
      const hue = (time * 0.1 + audioFeatures.energyFlux) % 1;
      spotLightRef.current.color.setHSL(hue, 0.5, 0.8);
    }
  });
  
  return (
    <>
      {/* Ambient base lighting */}
      <ambientLight intensity={0.2} />
      
      {/* Main directional light */}
      <directionalLight
        position={[5, 5, 5]}
        intensity={0.5}
        castShadow
        shadow-mapSize-width={quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={quality === 'ultra' ? 4096 : quality === 'high' ? 2048 : 1024}
        shadow-camera-far={20}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
      />
      
      {/* Dynamic point lights */}
      <pointLight
        ref={light1Ref}
        position={[5, 0, 0]}
        intensity={1}
        distance={10}
        decay={2}
        castShadow={quality === 'high' || quality === 'ultra'}
      />
      
      {quality !== 'low' && (
        <pointLight
          ref={light2Ref}
          position={[-5, 0, 0]}
          intensity={0.8}
          distance={8}
          decay={2}
        />
      )}
      
      {(quality === 'high' || quality === 'ultra') && (
        <pointLight
          ref={light3Ref}
          position={[0, 3, 0]}
          intensity={0.6}
          distance={6}
          decay={2}
        />
      )}
      
      {/* Beat-reactive spotlight */}
      {quality !== 'low' && (
        <group>
          <spotLight
            ref={spotLightRef}
            position={[0, 8, 0]}
            angle={Math.PI / 6}
            penumbra={0.5}
            intensity={1}
            distance={15}
            castShadow={quality === 'ultra'}
          />
          <mesh position={[0, 0, 0]}>
            <boxGeometry args={[0.1, 0.1, 0.1]} />
            <meshBasicMaterial visible={false} />
          </mesh>
        </group>
      )}
    </>
  );
};
