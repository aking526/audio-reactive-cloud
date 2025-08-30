import { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioFile: File;
}

const AudioPlayer = ({ audioFile }: AudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const dryGainNodeRef = useRef<GainNode | null>(null);
  const wetGainNodeRef = useRef<GainNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const pitchShifterRef = useRef<PitchShifter | null>(null);
  const bassBoostNodeRef = useRef<BiquadFilterNode | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seekValue, setSeekValue] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [reverbEnabled, setReverbEnabled] = useState(false);
  const [reverbMix, setReverbMix] = useState(0.5);
  const [pitchShiftEnabled, setPitchShiftEnabled] = useState(false);
  const [pitchValue, setPitchValue] = useState(0); // 0 is no change, range -12 to 12 semitones
  const [speedControlEnabled, setSpeedControlEnabled] = useState(false);
  const [speedValue, setSpeedValue] = useState(1.0); // 1.0 is normal speed
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [bassBoostAmount, setBassBoostAmount] = useState(6); // Default boost in dB

  // Pitch Shifter class that handles the audio processing for pitch shifting
  class PitchShifter {
    context: AudioContext;
    inputNode: GainNode;
    outputNode: GainNode;
    processor: ScriptProcessorNode;
    shift: number = 0;
    active: boolean = false;

    constructor(audioContext: AudioContext) {
      this.context = audioContext;
      this.inputNode = this.context.createGain();
      this.outputNode = this.context.createGain();
      
      // Create a ScriptProcessorNode for the pitch shifting
      this.processor = this.context.createScriptProcessor(4096, 1, 1);
      this.processor.onaudioprocess = this.processAudio.bind(this);
      
      // Connect the nodes
      this.inputNode.connect(this.processor);
      this.processor.connect(this.outputNode);
    }

    setPitchShift(semitones: number) {
      // Convert semitones to pitch shift factor
      // A semitone is a ratio of 2^(1/12), so for n semitones: 2^(n/12)
      this.shift = Math.pow(2, semitones / 12);
    }

    setActive(isActive: boolean) {
      this.active = isActive;
    }

    processAudio(event: AudioProcessingEvent) {
      const inputBuffer = event.inputBuffer;
      const outputBuffer = event.outputBuffer;
      
      // Get the audio data from the input buffer
      const inputData = inputBuffer.getChannelData(0);
      const outputData = outputBuffer.getChannelData(0);
      
      // If not active, just pass through the audio without modification
      if (!this.active) {
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = inputData[i];
        }
        return;
      }
      
      // Simple pitch shifting algorithm
      // This is a basic implementation - for better quality, more complex algorithms are needed
      const pitchRatio = this.shift;
      
      if (pitchRatio === 1.0) {
        // No pitch shift, just copy the data
        for (let i = 0; i < inputData.length; i++) {
          outputData[i] = inputData[i];
        }
      } else {
        // Apply pitch shift by simple resampling
        let readIndex = 0;
        const readIndexStep = pitchRatio;
        
        for (let i = 0; i < outputData.length; i++) {
          // Linear interpolation between samples
          const intIndex = Math.floor(readIndex);
          const fraction = readIndex - intIndex;
          
          if (intIndex < inputData.length - 1) {
            outputData[i] = (1 - fraction) * inputData[intIndex] + fraction * inputData[intIndex + 1];
          } else if (intIndex < inputData.length) {
            outputData[i] = inputData[intIndex];
          } else {
            outputData[i] = 0;
          }
          
          readIndex += readIndexStep;
        }
      }
    }

    connect(destination: AudioNode) {
      this.outputNode.connect(destination);
    }

    disconnect() {
      this.inputNode.disconnect();
      this.processor.disconnect();
      this.outputNode.disconnect();
    }
  }

  useEffect(() => {
    const url = URL.createObjectURL(audioFile);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.volume = volume;
    
    // Set initial playback speed if enabled
    if (speedControlEnabled) {
      audio.playbackRate = speedValue;
    }

    // Create Audio Context
    let audioContext: AudioContext;
    try {
      audioContext = new AudioContext();
    } catch {
      // Fallback for older browsers
      // @ts-expect-error: Safari/WebKit compatibility
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    audioContextRef.current = audioContext;
    
    // Create nodes
    const sourceNode = audioContext.createMediaElementSource(audio);
    sourceNodeRef.current = sourceNode;
    
    const gainNode = audioContext.createGain();
    gainNodeRef.current = gainNode;
    
    const dryGainNode = audioContext.createGain();
    dryGainNodeRef.current = dryGainNode;
    
    const wetGainNode = audioContext.createGain();
    wetGainNodeRef.current = wetGainNode;
    
    // Create convolver for reverb
    const convolverNode = audioContext.createConvolver();
    convolverNodeRef.current = convolverNode;
    
    // Create pitch shifter
    const pitchShifter = new PitchShifter(audioContext);
    pitchShifterRef.current = pitchShifter;
    
    // Create bass boost node
    const bassBoostNode = audioContext.createBiquadFilter();
    bassBoostNode.type = 'lowshelf';
    bassBoostNode.frequency.value = 150; // Boost around 150Hz
    bassBoostNode.gain.value = bassBoostEnabled ? bassBoostAmount : 0;
    bassBoostNodeRef.current = bassBoostNode;
    
    // Fetch impulse response for reverb
    fetch('/impulse-responses/hall.wav')
      .then(response => response.arrayBuffer())
      .then(buffer => audioContext.decodeAudioData(buffer))
      .then(decodedBuffer => {
        if (convolverNode) {
          convolverNode.buffer = decodedBuffer;
        }
      })
      .catch(err => console.error('Error loading impulse response:', err));
    
    // Basic connections (we'll handle the routing in another effect)
    sourceNode.connect(gainNode);
    
    // Initial node connections for reverb path
    gainNode.connect(convolverNode);
    convolverNode.connect(wetGainNode);
    wetGainNode.connect(audioContext.destination);
    
    // Set initial gain values for reverb
    updateReverbMix(reverbMix, reverbEnabled);
    
    // Update active state based on initial enabled state
    pitchShifter.setActive(pitchShiftEnabled);

    const onMetadata = () => {
      setDuration(audio.duration);
    };
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setSeekValue((audio.currentTime / audio.duration) * 100);
    };

    audio.addEventListener('loadedmetadata', onMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', onMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      URL.revokeObjectURL(url);
      // Clean up audio nodes
      if (sourceNodeRef.current) {
        sourceNodeRef.current.disconnect();
      }
      if (pitchShifterRef.current) {
        pitchShifterRef.current.disconnect();
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [audioFile]);

  // Handle dynamic routing of audio nodes when pitch shift is toggled
  useEffect(() => {
    const audioContext = audioContextRef.current;
    const gainNode = gainNodeRef.current;
    const dryGainNode = dryGainNodeRef.current;
    const wetGainNode = wetGainNodeRef.current;
    const pitchShifter = pitchShifterRef.current;
    const bassBoostNode = bassBoostNodeRef.current;
    const convolverNode = convolverNodeRef.current;
    
    if (!audioContext || !gainNode || !dryGainNode || !wetGainNode || !pitchShifter || !bassBoostNode || !convolverNode) return;
    
    // Update pitch shifter active state to prevent audio interruption
    pitchShifter.setActive(pitchShiftEnabled);
    
    // Safer disconnection of nodes
    try {
      gainNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }
    
    try {
      bassBoostNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }
    
    try {
      dryGainNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }
    
    try {
      wetGainNode.disconnect();
    } catch {
      // Ignore disconnection errors
    }
    
    // Connect source to gain node first (always needed)
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore disconnection errors
      }
      sourceNodeRef.current.connect(gainNode);
    }
    
    // Build the main signal chain - always include pitch shifter with active/inactive state
    if (bassBoostEnabled) {
      // Bass boost enabled
      gainNode.connect(bassBoostNode);
      bassBoostNode.connect(pitchShifter.inputNode);
      pitchShifter.connect(dryGainNode);
    } else {
      // No bass boost
      gainNode.connect(pitchShifter.inputNode);
      pitchShifter.connect(dryGainNode);
    }
    
    // Set up reverb path (always connected from gain node for consistent effect)
    gainNode.connect(convolverNode);
    convolverNode.connect(wetGainNode);
    
    // Final connections to destination
    dryGainNode.connect(audioContext.destination);
    wetGainNode.connect(audioContext.destination);
    
    // Update the wet/dry mix for reverb
    updateReverbMix(reverbMix, reverbEnabled);
    
  }, [bassBoostEnabled, reverbEnabled, reverbMix]);

  // Handle pitch shifter changes without reconfiguring audio graph
  useEffect(() => {
    if (pitchShifterRef.current) {
      pitchShifterRef.current.setActive(pitchShiftEnabled);
      pitchShifterRef.current.setPitchShift(pitchValue);
    }
  }, [pitchShiftEnabled, pitchValue]);

  // Handle speed control
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (speedControlEnabled) {
      audio.playbackRate = speedValue;
    } else {
      audio.playbackRate = 1.0;
    }
  }, [speedControlEnabled, speedValue]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);
  
  const updateReverbMix = (mix: number, enabled: boolean) => {
    if (!dryGainNodeRef.current || !wetGainNodeRef.current) return;
    
    if (enabled) {
      // When reverb is enabled, adjust the dry/wet mix
      dryGainNodeRef.current.gain.value = 1 - mix;
      wetGainNodeRef.current.gain.value = mix;
    } else {
      // When reverb is disabled, set wet to 0
      dryGainNodeRef.current.gain.value = 1;
      wetGainNodeRef.current.gain.value = 0;
    }
  };
  
  useEffect(() => {
    updateReverbMix(reverbMix, reverbEnabled);
  }, [reverbMix, reverbEnabled]);
  
  useEffect(() => {
    if (bassBoostNodeRef.current) {
      bassBoostNodeRef.current.gain.value = bassBoostEnabled ? bassBoostAmount : 0;
    }
  }, [bassBoostEnabled, bassBoostAmount]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // Resume AudioContext if it's suspended
    if (audioContextRef.current?.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSeekValue(value);
    const audio = audioRef.current;
    if (audio) {
      const time = (value / 100) * duration;
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };
  
  const toggleReverb = () => {
    setReverbEnabled(!reverbEnabled);
  };
  
  const togglePitchShift = () => {
    setPitchShiftEnabled(!pitchShiftEnabled);
  };
  
  const toggleBassBoost = () => {
    setBassBoostEnabled(!bassBoostEnabled);
  };
  
  const handleReverbMixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setReverbMix(value);
  };
  
  const handlePitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setPitchValue(value);
  };

  const toggleSpeedControl = () => {
    setSpeedControlEnabled(!speedControlEnabled);
  };
  
  const handleSpeedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setSpeedValue(value);
  };

  const handleBassBoostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBassBoostAmount(value);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Audio Player</h2>
        <div className="mb-6">
          <div className="relative w-full h-20 mb-2 bg-gray-100 rounded-lg overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-indigo-500 opacity-50 transition-all duration-100"
              style={{ width: `${seekValue}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={seekValue}
            onChange={handleSeek}
            className="w-full h-2 mb-2 bg-gray-200 rounded-full appearance-none focus:outline-none"
          />
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        {/* Effects Controls */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-md font-semibold text-gray-700 mb-3">Effects</h3>
          
          {/* Reverb Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="reverb-toggle" className="text-sm font-medium text-gray-700">
                Reverb
              </label>
              <button 
                onClick={toggleReverb}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${reverbEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${reverbEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {reverbEnabled && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Dry</span>
                  <span>Wet</span>
                </div>
                <input
                  id="reverb-mix"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={reverbMix}
                  onChange={handleReverbMixChange}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none focus:outline-none"
                />
              </div>
            )}
          </div>
          
          {/* Pitch Shift Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="pitch-shift-toggle" className="text-sm font-medium text-gray-700">
                Pitch Shift
              </label>
              <button 
                onClick={togglePitchShift}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${pitchShiftEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${pitchShiftEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {pitchShiftEnabled && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>-12</span>
                  <span>0</span>
                  <span>+12</span>
                </div>
                <input
                  id="pitch-shift"
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={pitchValue}
                  onChange={handlePitchChange}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none focus:outline-none"
                />
                <div className="flex justify-center text-xs text-gray-700 mt-1">
                  <span>Current: {pitchValue > 0 ? '+' : ''}{pitchValue} semitones</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Speed Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="speed-control-toggle" className="text-sm font-medium text-gray-700">
                Speed Control
              </label>
              <button 
                onClick={toggleSpeedControl}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${speedControlEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${speedControlEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {speedControlEnabled && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0x</span>
                  <span>1x</span>
                  <span>2x</span>
                </div>
                <div className="relative">
                  <input
                    id="speed-control"
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={speedValue}
                    onChange={handleSpeedChange}
                    className="w-full h-2 bg-gray-200 rounded-full appearance-none focus:outline-none"
                  />
                  {/* Visual indicator for where 1.0x is located */}
                  <div 
                    className="absolute top-1/2 w-0.5 h-3 bg-gray-400 -translate-y-1/2 pointer-events-none" 
                    style={{ left: '50%' }}
                  />
                </div>
                <div className="flex justify-center text-xs text-gray-700 mt-1">
                  <span>Current: {speedValue.toFixed(1)}x</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Bass Boost Control */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="bass-boost-toggle" className="text-sm font-medium text-gray-700">
                Bass Boost
              </label>
              <button 
                onClick={toggleBassBoost}
                className={`relative inline-flex h-6 w-11 items-center rounded-full ${bassBoostEnabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${bassBoostEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            {bassBoostEnabled && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>0 dB</span>
                  <span>10 dB</span>
                  <span>20 dB</span>
                </div>
                <input
                  id="bass-boost"
                  type="range"
                  min={0}
                  max={20}
                  step={1}
                  value={bassBoostAmount}
                  onChange={handleBassBoostChange}
                  className="w-full h-2 bg-gray-200 rounded-full appearance-none focus:outline-none"
                />
                <div className="flex justify-center text-xs text-gray-700 mt-1">
                  <span>Boost: {bassBoostAmount} dB</span>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <button
            onClick={togglePlay}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center focus:outline-none"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            )}
          </button>
          <div className="flex items-center flex-grow ml-4">
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="flex-grow h-2 bg-gray-200 rounded-full appearance-none focus:outline-none ml-2"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer; 