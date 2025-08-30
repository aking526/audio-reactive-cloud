import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioFeatures } from './types';

interface ParticleEmitterProps {
  audioFeatures: AudioFeatures;
  particleIntensity: number;
  quality: 'low' | 'medium' | 'high' | 'ultra';
}

const PARTICLE_COUNTS = {
  low: 100,
  medium: 500,
  high: 1000,
  ultra: 2000
};

export const ParticleEmitter: React.FC<ParticleEmitterProps> = ({ 
  audioFeatures, 
  particleIntensity,
  quality 
}) => {
  const particleRef = useRef<THREE.Points>(null);
  const particleCount = PARTICLE_COUNTS[quality];
  
  // Particle state stored in geometry attributes
  const { positions, velocities, lifetimes, sizes, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const lifetimes = new Float32Array(particleCount);
    const sizes = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);
    
    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      
      // Start at origin
      positions[i3] = 0;
      positions[i3 + 1] = 0;
      positions[i3 + 2] = 0;
      
      // Random velocities
      velocities[i3] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.02;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.02;
      
      // Random lifetimes (negative means not active)
      lifetimes[i] = -1;
      
      // Random sizes
      sizes[i] = Math.random() * 0.1 + 0.05;
      
      // Initial white color
      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;
    }
    
    return { positions, velocities, lifetimes, sizes, colors };
  }, [particleCount]);
  
  // Create geometry
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geo.setAttribute('lifetime', new THREE.BufferAttribute(lifetimes, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [positions, velocities, lifetimes, sizes, colors]);
  
  // Shader material for particles
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beatIntensity: { value: 0 },
        spectralCentroid: { value: 0 }
      },
      vertexShader: `
        attribute vec3 velocity;
        attribute float lifetime;
        attribute float size;
        attribute vec3 color;
        
        varying vec3 vColor;
        varying float vLifetime;
        
        uniform float time;
        
        void main() {
          vColor = color;
          vLifetime = lifetime;
          
          vec3 pos = position;
          
          // Only show active particles
          float scale = lifetime > 0.0 ? size * (1.0 - lifetime) : 0.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = scale * 300.0 / -mvPosition.z;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vLifetime;
        
        void main() {
          if (vLifetime < 0.0) discard;
          
          // Circular particle shape
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          
          // Fade out based on lifetime
          float alpha = (1.0 - vLifetime) * (1.0 - dist * 2.0);
          
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }, []);
  
  // Particle emission timing
  const emissionTimer = useRef(0);
  const nextParticleIndex = useRef(0);
  
  useFrame((state, delta) => {
    if (!particleRef.current || !audioFeatures) return;
    
    const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
    const velocityAttr = geometry.attributes.velocity as THREE.BufferAttribute;
    const lifetimeAttr = geometry.attributes.lifetime as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
    
    // Update uniforms
    material.uniforms.time.value = state.clock.elapsedTime;
    material.uniforms.beatIntensity.value = audioFeatures.beatIntensity;
    material.uniforms.spectralCentroid.value = audioFeatures.spectralCentroid;
    
    // Emission rate based on beat intensity and particle intensity setting
    const emissionRate = audioFeatures.beatIntensity * particleIntensity * 50;
    emissionTimer.current += delta;
    
    // Emit new particles
    if (emissionTimer.current > 1 / emissionRate && emissionRate > 0) {
      emissionTimer.current = 0;
      
      // Find next available particle slot
      for (let attempts = 0; attempts < 10; attempts++) {
        const i = nextParticleIndex.current;
        
        if (lifetimeAttr.getX(i) < 0) {
          // Emit particle from sphere surface
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);
          const radius = 2.2; // Slightly outside sphere
          
          const x = radius * Math.sin(phi) * Math.cos(theta);
          const y = radius * Math.sin(phi) * Math.sin(theta);
          const z = radius * Math.cos(phi);
          
          positionAttr.setXYZ(i, x, y, z);
          
          // Set velocity outward from sphere with some randomness
          const speed = 0.5 + audioFeatures.energyFlux * 2;
          const vx = x / radius * speed + (Math.random() - 0.5) * 0.2;
          const vy = y / radius * speed + (Math.random() - 0.5) * 0.2;
          const vz = z / radius * speed + (Math.random() - 0.5) * 0.2;
          
          velocityAttr.setXYZ(i, vx, vy, vz);
          
          // Set lifetime
          lifetimeAttr.setX(i, 0);
          
          // Set color based on frequency
          const hue = audioFeatures.spectralCentroid / 1000;
          const color = new THREE.Color();
          color.setHSL(hue, 0.8, 0.6);
          colorAttr.setXYZ(i, color.r, color.g, color.b);
          
          break;
        }
        
        nextParticleIndex.current = (nextParticleIndex.current + 1) % particleCount;
      }
    }
    
    // Update all particles
    for (let i = 0; i < particleCount; i++) {
      const lifetime = lifetimeAttr.getX(i);
      
      if (lifetime >= 0) {
        // Update lifetime
        lifetimeAttr.setX(i, lifetime + delta);
        
        // Reset if lifetime exceeded
        if (lifetime > 1) {
          lifetimeAttr.setX(i, -1);
          continue;
        }
        
        // Update position based on velocity
        const x = positionAttr.getX(i) + velocityAttr.getX(i) * delta;
        const y = positionAttr.getY(i) + velocityAttr.getY(i) * delta;
        const z = positionAttr.getZ(i) + velocityAttr.getZ(i) * delta;
        
        positionAttr.setXYZ(i, x, y, z);
        
        // Apply gravity
        velocityAttr.setY(i, velocityAttr.getY(i) - 0.5 * delta);
      }
    }
    
    // Mark attributes as needing update
    positionAttr.needsUpdate = true;
    lifetimeAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });
  
  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);
  
  return (
    <points ref={particleRef}>
      <primitive object={geometry} />
      <primitive object={material} />
    </points>
  );
};
