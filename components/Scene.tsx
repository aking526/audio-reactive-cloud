"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { motion } from "framer-motion";
import * as THREE from "three";

interface ParticleCloudProps {
  pointCount: number;
  pointSize: number;
}

function ParticleCloud({ pointCount, pointSize }: ParticleCloudProps) {
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);
    const colors = new Float32Array(pointCount * 3);
    
    for (let i = 0; i < pointCount; i++) {
      const i3 = i * 3;
      
      // Create spherical distribution
      const radius = Math.random() * 10 + 5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
      
      // Random colors with slight blue/cyan bias
      colors[i3] = 0.3 + Math.random() * 0.4; // R
      colors[i3 + 1] = 0.5 + Math.random() * 0.5; // G
      colors[i3 + 2] = 0.8 + Math.random() * 0.2; // B
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    return geometry;
  }, [pointCount]);

  return (
    <points geometry={geometry}>
      <pointsMaterial
        size={pointSize}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
      />
    </points>
  );
}

interface SceneProps {
  pointCount?: number;
  pointSize?: number;
}

export function Scene({ pointCount = 15000, pointSize = 0.8 }: SceneProps) {
  return (
    <motion.div 
      className="w-full h-full"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <Canvas
        camera={{ 
          position: [20, 10, 20], 
          fov: 75,
          near: 0.1,
          far: 1000
        }}
        gl={{ 
          antialias: true,
          alpha: true,
          preserveDrawingBuffer: true
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <pointLight position={[-10, -10, -10]} intensity={0.3} />
        
        <ParticleCloud pointCount={pointCount} pointSize={pointSize} />
        
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={10}
          maxDistance={50}
          maxPolarAngle={Math.PI}
          minPolarAngle={0}
        />
      </Canvas>
    </motion.div>
  );
}