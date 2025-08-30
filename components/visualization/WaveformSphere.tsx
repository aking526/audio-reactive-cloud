import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { AudioFeatures } from './types';
// Import shader code as strings
const vertexShader = `
uniform float time;
uniform float beatIntensity;
uniform float deformationIntensity;
uniform sampler2D frequencyTexture;
uniform float sensitivity;
uniform vec3 frequencyBands; // x: low, y: mid, z: high

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

// Simplex 3D Noise 
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 =   v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod(i, 289.0); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = position;
  
  // Sample frequency data based on vertex position
  float theta = atan(position.y, position.x);
  float phi = acos(position.z / length(position));
  vec2 freqUv = vec2(theta / (2.0 * 3.14159) + 0.5, phi / 3.14159);
  float freqSample = texture2D(frequencyTexture, freqUv).r;
  
  // Multi-octave noise for organic movement
  float noise1 = snoise(position * 0.5 + time * 0.2) * 0.5;
  float noise2 = snoise(position * 1.5 + time * 0.3) * 0.25;
  float noise3 = snoise(position * 3.0 + time * 0.5) * 0.125;
  float totalNoise = (noise1 + noise2 + noise3) * deformationIntensity;
  
  // Frequency-based displacement
  float lowFreqInfluence = frequencyBands.x * 0.3;
  float midFreqInfluence = frequencyBands.y * 0.2;
  float highFreqInfluence = frequencyBands.z * 0.1;
  
  // Beat-reactive pulsing
  float beatPulse = beatIntensity * 0.2 * sin(time * 10.0);
  
  // Combine all displacements
  float displacement = (
    totalNoise + 
    freqSample * 0.4 + 
    lowFreqInfluence + 
    midFreqInfluence + 
    highFreqInfluence +
    beatPulse
  ) * sensitivity;
  
  vDisplacement = displacement;
  
  // Apply displacement along normal
  vec3 displacedPosition = position + normal * displacement;
  
  // Transform position
  vec4 modelViewPosition = modelViewMatrix * vec4(displacedPosition, 1.0);
  gl_Position = projectionMatrix * modelViewPosition;
}
`;

const fragmentShader = `
uniform float time;
uniform float beatIntensity;
uniform float spectralCentroid;
uniform float rms;
uniform float glowIntensity;
uniform vec3 colorScheme; // x: hue shift, y: saturation, z: brightness
uniform sampler2D frequencyTexture;
uniform float energyFlux;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
varying float vDisplacement;

// Color scheme functions
vec3 rainbowColor(float t) {
  float hue = mod(t + time * 0.05, 1.0);
  return vec3(
    abs(hue * 6.0 - 3.0) - 1.0,
    2.0 - abs(hue * 6.0 - 2.0),
    2.0 - abs(hue * 6.0 - 4.0)
  );
}

vec3 fireColor(float t) {
  return vec3(
    1.0,
    0.5 + 0.5 * t,
    0.2 * t
  );
}

vec3 oceanColor(float t) {
  return vec3(
    0.1 + 0.2 * t,
    0.3 + 0.4 * t,
    0.7 + 0.3 * t
  );
}

vec3 neonColor(float t) {
  float pulse = sin(time * 5.0 + t * 10.0) * 0.5 + 0.5;
  return vec3(
    pulse,
    0.1 + pulse * 0.5,
    1.0
  );
}

vec3 hsl2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z + c.y * (rgb - 0.5) * (1.0 - abs(2.0 * c.z - 1.0));
}

void main() {
  // Sample frequency for color modulation
  vec2 freqUv = vUv;
  float freqSample = texture2D(frequencyTexture, freqUv).r;
  
  // Calculate base color based on spectral centroid and displacement
  float colorParam = spectralCentroid / 1000.0 + vDisplacement * 0.5;
  
  vec3 baseColor;
  // Select color scheme based on uniform (simplified for now, can be expanded)
  if (colorScheme.x < 0.25) {
    baseColor = rainbowColor(colorParam);
  } else if (colorScheme.x < 0.5) {
    baseColor = fireColor(colorParam);
  } else if (colorScheme.x < 0.75) {
    baseColor = oceanColor(colorParam);
  } else {
    baseColor = neonColor(colorParam);
  }
  
  // Apply frequency-based color modulation
  vec3 hsl = vec3(
    mod(colorParam + freqSample * 0.2, 1.0), // Hue
    0.7 + beatIntensity * 0.3,               // Saturation
    0.4 + rms * 0.4                          // Lightness
  );
  
  vec3 color = hsl2rgb(hsl);
  
  // Lighting calculations
  vec3 viewDir = normalize(-vPosition);
  vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
  float diff = max(dot(vNormal, lightDir), 0.0);
  
  // Add rim lighting for glow effect
  float rim = 1.0 - dot(viewDir, vNormal);
  rim = pow(rim, 2.0) * glowIntensity;
  
  // Energy flux creates flashing effect
  float flash = energyFlux * 0.5;
  
  // Combine lighting
  vec3 finalColor = color * (0.3 + diff * 0.7) + rim * color + flash;
  
  // Add emissive glow based on beat intensity
  vec3 emissive = color * beatIntensity * glowIntensity * 0.5;
  finalColor += emissive;
  
  // Depth-based fade for atmospheric effect
  float depth = length(vPosition);
  float fog = exp(-depth * 0.05);
  
  gl_FragColor = vec4(finalColor * fog, 1.0);
}
`;

interface WaveformSphereProps {
  audioFeatures: AudioFeatures;
  settings: {
    sensitivity: number;
    smoothing: number;
    colorScheme: 'rainbow' | 'fire' | 'ocean' | 'neon';
    quality: 'low' | 'medium' | 'high' | 'ultra';
    deformationIntensity: number;
    glowIntensity: number;
  };
}

// Quality settings for sphere geometry
const QUALITY_SETTINGS = {
  low: { widthSegments: 32, heightSegments: 32 },
  medium: { widthSegments: 64, heightSegments: 64 },
  high: { widthSegments: 128, heightSegments: 128 },
  ultra: { widthSegments: 256, heightSegments: 256 }
};

// Color scheme mappings
const COLOR_SCHEME_VALUES = {
  rainbow: 0.0,
  fire: 0.3,
  ocean: 0.6,
  neon: 0.9
};

export const WaveformSphere: React.FC<WaveformSphereProps> = ({ audioFeatures, settings }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { gl } = useThree();
  
  // Create frequency texture from audio data
  const frequencyTexture = useMemo(() => {
    const size = 256;
    const data = new Uint8Array(size * size);
    const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Create geometry based on quality setting
  const geometry = useMemo(() => {
    const qualityConfig = QUALITY_SETTINGS[settings.quality];
    return new THREE.IcosahedronGeometry(2, Math.floor(qualityConfig.widthSegments / 16));
  }, [settings.quality]);

  // Create shader material
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        beatIntensity: { value: 0 },
        spectralCentroid: { value: 0 },
        rms: { value: 0 },
        deformationIntensity: { value: settings.deformationIntensity },
        glowIntensity: { value: settings.glowIntensity },
        sensitivity: { value: settings.sensitivity },
        colorScheme: { value: new THREE.Vector3(COLOR_SCHEME_VALUES[settings.colorScheme], 0.8, 0.5) },
        frequencyTexture: { value: frequencyTexture },
        frequencyBands: { value: new THREE.Vector3(0, 0, 0) },
        energyFlux: { value: 0 }
      },
      vertexShader,
      fragmentShader,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: true
    });
  }, [frequencyTexture, settings.deformationIntensity, settings.glowIntensity, settings.sensitivity, settings.colorScheme]);

  // Update frequency texture with audio data
  useEffect(() => {
    if (!audioFeatures.frequencyData) return;

    const size = 256;
    const data = new Uint8Array(size * size);
    const freqLength = audioFeatures.frequencyData.length;
    
    // Map frequency data to 2D texture
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const index = i * size + j;
        const freqIndex = Math.floor((index / (size * size)) * freqLength);
        data[index] = audioFeatures.frequencyData[Math.min(freqIndex, freqLength - 1)];
      }
    }
    
    frequencyTexture.image.data.set(data);
    frequencyTexture.needsUpdate = true;
  }, [audioFeatures.frequencyData, frequencyTexture]);

  // Animation loop
  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const uniforms = materialRef.current.uniforms;
    
    // Update time
    uniforms.time.value = state.clock.elapsedTime;
    
    // Smooth transitions using lerp
    const lerpFactor = 1 - Math.pow(1 - settings.smoothing, 3);
    
    // Update audio-reactive uniforms with smoothing
    uniforms.beatIntensity.value = THREE.MathUtils.lerp(
      uniforms.beatIntensity.value,
      audioFeatures.beatIntensity,
      lerpFactor
    );
    
    uniforms.spectralCentroid.value = THREE.MathUtils.lerp(
      uniforms.spectralCentroid.value,
      audioFeatures.spectralCentroid,
      lerpFactor
    );
    
    uniforms.rms.value = THREE.MathUtils.lerp(
      uniforms.rms.value,
      audioFeatures.rms,
      lerpFactor
    );
    
    uniforms.energyFlux.value = THREE.MathUtils.lerp(
      uniforms.energyFlux.value,
      audioFeatures.energyFlux,
      lerpFactor
    );
    
    // Update frequency bands
    uniforms.frequencyBands.value.set(
      audioFeatures.frequencyBands.low,
      audioFeatures.frequencyBands.mid,
      audioFeatures.frequencyBands.high
    );
    
    // Update material settings
    uniforms.sensitivity.value = settings.sensitivity;
    uniforms.deformationIntensity.value = settings.deformationIntensity;
    uniforms.glowIntensity.value = settings.glowIntensity;
    uniforms.colorScheme.value.x = COLOR_SCHEME_VALUES[settings.colorScheme];
    
    // Gentle rotation when playing
    if (audioFeatures.isPlaying) {
      meshRef.current.rotation.y += 0.001;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.05;
    }
  });

  // Cleanup
  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      frequencyTexture.dispose();
    };
  }, [geometry, material, frequencyTexture]);

  return (
    <mesh ref={meshRef} castShadow receiveShadow>
      <primitive object={geometry} />
      <primitive object={material} ref={materialRef} />
    </mesh>
  );
};
