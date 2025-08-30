import { useEffect, useRef, useState, useCallback } from 'react';
import { AudioFeatures, FrequencyBands } from './types';

// Reusable feature objects to prevent unnecessary re-renders
let reusableFeatures: AudioFeatures | null = null;
let previousEnergy = 0; // For energy flux calculation

interface AudioAnalyzerProps {
  audioContext: AudioContext | null;
  analyserInputNode: GainNode | null;
  isPlaying: boolean;
  onFeaturesUpdate: (features: AudioFeatures) => void;
}

export const AudioAnalyzer: React.FC<AudioAnalyzerProps> = ({
  audioContext,
  analyserInputNode,
  isPlaying,
  onFeaturesUpdate
}) => {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize analyser node
  useEffect(() => {
    if (!audioContext || !analyserInputNode) {
      setIsInitialized(false);
      return;
    }

    const analyser = audioContext.createAnalyser();
    // Use smaller FFT size for faster processing on lower quality settings
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    analyserInputNode.connect(analyser);
    analyserRef.current = analyser;
    setIsInitialized(true);

    return () => {
      if (analyserRef.current) {
        analyserInputNode.disconnect(analyserRef.current);
        analyserRef.current = null;
      }
      setIsInitialized(false);
    };
  }, [audioContext, analyserInputNode]);

  // Audio analysis loop
  const analyze = useCallback(() => {
    if (!analyserRef.current || !isInitialized || !audioContext) return;

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
    const frequencyBands = calculateFrequencyBands(frequencyData, audioContext.sampleRate);
    const energyFlux = calculateEnergyFlux(frequencyData);
    const peakFrequencies = findPeakFrequencies(frequencyData, audioContext.sampleRate);

    // Check if we need to update (compare with previous values)
    const needsUpdate = !reusableFeatures ||
      reusableFeatures.isPlaying !== isPlaying ||
      Math.abs(reusableFeatures.rms - rms) > 0.001 ||
      Math.abs(reusableFeatures.beatIntensity - beatIntensity) > 0.001 ||
      Math.abs(reusableFeatures.spectralCentroid - spectralCentroid) > 0.1 ||
      Math.abs(reusableFeatures.dominantFrequency - dominantFrequency) > 10;

    if (needsUpdate) {
      // Reuse or create features object
      if (!reusableFeatures) {
        reusableFeatures = {
          frequencyData: new Uint8Array(bufferLength),
          timeData: new Uint8Array(bufferLength),
          beatIntensity: 0,
          spectralCentroid: 0,
          rms: 0,
          dominantFrequency: 0,
          isPlaying: false,
          frequencyBands: { low: 0, mid: 0, high: 0 },
          energyFlux: 0,
          peakFrequencies: []
        };
      }

      // Update arrays by copying data
      reusableFeatures.frequencyData.set(frequencyData);
      reusableFeatures.timeData.set(timeData);
      reusableFeatures.beatIntensity = beatIntensity;
      reusableFeatures.spectralCentroid = spectralCentroid;
      reusableFeatures.rms = rms;
      reusableFeatures.dominantFrequency = dominantFrequency;
      reusableFeatures.isPlaying = isPlaying;
      reusableFeatures.frequencyBands = frequencyBands;
      reusableFeatures.energyFlux = energyFlux;
      reusableFeatures.peakFrequencies = peakFrequencies;

      onFeaturesUpdate(reusableFeatures);
    }

    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(analyze);
    }
  }, [isInitialized, isPlaying, onFeaturesUpdate, audioContext]);

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

function calculateFrequencyBands(frequencyData: Uint8Array, sampleRate: number): FrequencyBands {
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / frequencyData.length;
  
  // Define frequency band boundaries
  const lowEndBin = Math.floor(250 / binWidth);
  const midEndBin = Math.floor(2000 / binWidth);
  
  let lowSum = 0, midSum = 0, highSum = 0;
  let lowCount = 0, midCount = 0, highCount = 0;
  
  for (let i = 0; i < frequencyData.length; i++) {
    const value = frequencyData[i] / 255; // Normalize to 0-1
    
    if (i < lowEndBin) {
      lowSum += value;
      lowCount++;
    } else if (i < midEndBin) {
      midSum += value;
      midCount++;
    } else {
      highSum += value;
      highCount++;
    }
  }
  
  return {
    low: lowCount > 0 ? lowSum / lowCount : 0,
    mid: midCount > 0 ? midSum / midCount : 0,
    high: highCount > 0 ? highSum / highCount : 0
  };
}

function calculateEnergyFlux(frequencyData: Uint8Array): number {
  // Calculate total energy
  let currentEnergy = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    currentEnergy += (frequencyData[i] / 255) ** 2;
  }
  
  // Calculate flux (rate of change)
  const flux = Math.abs(currentEnergy - previousEnergy);
  previousEnergy = currentEnergy;
  
  // Normalize flux to 0-1 range
  return Math.min(flux / 100, 1);
}

function findPeakFrequencies(frequencyData: Uint8Array, sampleRate: number): number[] {
  const nyquist = sampleRate / 2;
  const binWidth = nyquist / frequencyData.length;
  
  // Find peaks (local maxima)
  const peaks: { index: number; value: number }[] = [];
  
  for (let i = 1; i < frequencyData.length - 1; i++) {
    if (frequencyData[i] > frequencyData[i - 1] && 
        frequencyData[i] > frequencyData[i + 1] &&
        frequencyData[i] > 128) { // Threshold to avoid noise
      peaks.push({ index: i, value: frequencyData[i] });
    }
  }
  
  // Sort by value and take top 5
  peaks.sort((a, b) => b.value - a.value);
  const topPeaks = peaks.slice(0, 5);
  
  // Convert to frequencies
  return topPeaks.map(peak => peak.index * binWidth);
}