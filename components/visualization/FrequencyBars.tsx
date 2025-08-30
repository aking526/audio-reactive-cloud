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