import { useRef, useEffect, useState } from 'react';

export interface AudioAnalysisData {
  frequencyData: Uint8Array;
  waveformData: Uint8Array;
  volume: number;
  averageFrequency: number;
  bassEnergy: number;
  midsEnergy: number;
  highsEnergy: number;
}

export interface UseAudioDataProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  enabled?: boolean;
}

export function useAudioData({ analyserNode, isPlaying, enabled = true }: UseAudioDataProps) {
  const [audioData, setAudioData] = useState<AudioAnalysisData | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const frequencyDataRef = useRef<Uint8Array | null>(null);
  const waveformDataRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!analyserNode || !enabled) {
      setAudioData(null);
      return;
    }

    // Initialize data arrays based on analyser settings
    const bufferLength = analyserNode.frequencyBinCount;
    frequencyDataRef.current = new Uint8Array(bufferLength);
    waveformDataRef.current = new Uint8Array(bufferLength);

    const updateAudioData = () => {
      if (!analyserNode || !frequencyDataRef.current || !waveformDataRef.current) {
        return;
      }

      // Get frequency and waveform data
      analyserNode.getByteFrequencyData(frequencyDataRef.current);
      analyserNode.getByteTimeDomainData(waveformDataRef.current);

      const frequencyData = frequencyDataRef.current;
      const waveformData = waveformDataRef.current;

      // Calculate volume (RMS of waveform data)
      let sum = 0;
      for (let i = 0; i < waveformData.length; i++) {
        const sample = (waveformData[i] - 128) / 128; // Normalize to -1 to 1
        sum += sample * sample;
      }
      const volume = Math.sqrt(sum / waveformData.length);

      // Calculate average frequency
      let frequencySum = 0;
      for (let i = 0; i < frequencyData.length; i++) {
        frequencySum += frequencyData[i];
      }
      const averageFrequency = frequencySum / frequencyData.length;

      // Calculate energy in different frequency bands
      const bassEnd = Math.floor(frequencyData.length * 0.1); // ~0-250Hz
      const midsEnd = Math.floor(frequencyData.length * 0.5); // ~250-2500Hz
      
      let bassSum = 0, midsSum = 0, highsSum = 0;
      
      for (let i = 0; i < bassEnd; i++) {
        bassSum += frequencyData[i];
      }
      for (let i = bassEnd; i < midsEnd; i++) {
        midsSum += frequencyData[i];
      }
      for (let i = midsEnd; i < frequencyData.length; i++) {
        highsSum += frequencyData[i];
      }

      const bassEnergy = bassSum / bassEnd;
      const midsEnergy = midsSum / (midsEnd - bassEnd);
      const highsEnergy = highsSum / (frequencyData.length - midsEnd);

      setAudioData({
        frequencyData: new Uint8Array(frequencyData),
        waveformData: new Uint8Array(waveformData),
        volume,
        averageFrequency,
        bassEnergy,
        midsEnergy,
        highsEnergy
      });

      // Continue animation loop if playing
      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateAudioData);
      }
    };

    // Start the animation loop if playing
    if (isPlaying) {
      updateAudioData();
    } else {
      // Provide empty data when not playing
      setAudioData({
        frequencyData: new Uint8Array(frequencyDataRef.current.length),
        waveformData: new Uint8Array(waveformDataRef.current.length),
        volume: 0,
        averageFrequency: 0,
        bassEnergy: 0,
        midsEnergy: 0,
        highsEnergy: 0
      });
    }

    // Cleanup function
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [analyserNode, isPlaying, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return audioData;
}