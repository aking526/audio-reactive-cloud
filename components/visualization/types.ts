export interface FrequencyBands {
  low: number;    // 0-250Hz average
  mid: number;    // 250-2000Hz average
  high: number;   // 2000Hz+ average
}

export interface AudioFeatures {
  frequencyData: Uint8Array;
  timeData: Uint8Array;
  beatIntensity: number;
  spectralCentroid: number;
  rms: number;
  dominantFrequency: number;
  isPlaying: boolean;
  frequencyBands: FrequencyBands;
  energyFlux: number;  // Rate of change in energy
  peakFrequencies: number[];  // Top 5 peak frequencies
}

export type VisualizationType = 'sphere';

export interface VisualizationSettings {
  sensitivity: number; // 0-2, how responsive the viz is to audio
  smoothing: number;   // 0-1, how smooth the animations are
  colorScheme: 'rainbow' | 'fire' | 'ocean' | 'neon';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  deformationIntensity: number;  // 0-1, strength of sphere deformation
  particleIntensity: number;     // 0-1, particle emission rate
  glowIntensity: number;         // 0-1, emissive glow strength
}

export interface StudioVisualizationState {
  currentVisualization: VisualizationType;
  audioFeatures: AudioFeatures | null;
  settings: VisualizationSettings;
  isActive: boolean;
}