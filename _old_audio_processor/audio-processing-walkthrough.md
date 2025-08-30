# Audio Processing Studio: Code Walkthrough

## Introduction

Welcome to the code walkthrough of our Audio Processing Studio project. This web application allows users to upload audio files, play them, and apply various audio effects like reverb, pitch shifting, speed control, and bass boost. The app is built using React, TypeScript, Vite, and modern Web Audio API technologies.

## Project Structure

Our project follows a standard React application structure:

```
audio-processing-final/
├── node_modules/       # Dependencies
├── public/             # Static assets
│   └── impulse-responses/ # Reverb impulse response files
├── src/                # Source code
│   ├── components/     # React components
│   │   ├── AudioPlayer.tsx  # Main audio player with effects
│   │   └── AudioUploader.tsx # Audio file upload component
│   ├── App.tsx         # Main application component
│   ├── main.tsx        # Entry point
│   └── index.css       # Global styles
├── package.json        # Dependencies and scripts
└── vite.config.ts      # Vite configuration
```

## Core Components

Let's walk through the main components of our application:

### App Component

The App component serves as the main container for our application. It maintains the state of the uploaded audio file and conditionally renders either the AudioUploader or AudioPlayer component.

```tsx
function App() {
  const [audioFile, setAudioFile] = useState<File | null>(null)

  const handleAudioLoaded = (_buffer: unknown, file: File) => {
    setAudioFile(file)
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {!audioFile ? (
          <>
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Audio Processing Studio</h1>
              <p className="text-lg text-gray-600">Upload, play, and modify audio with ease</p>
            </header>
            <AudioUploader onAudioLoaded={handleAudioLoaded} />
          </>
        ) : (
          <div className="space-y-8">
            <AudioPlayer audioFile={audioFile} />
            <div className="flex justify-center">
              <button onClick={() => setAudioFile(null)}>
                Upload a different audio file
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

When no audio file is uploaded, we display a welcome header and the AudioUploader component. Once a file is uploaded, we switch to showing the AudioPlayer component and a button to return to the uploader.

### AudioUploader Component

The AudioUploader component handles file selection and initial processing of audio files:

```tsx
const AudioUploader = ({ onAudioLoaded }: AudioUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if file is an audio file
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file.');
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setError(null);

    try {
      // Create a URL for the audio file
      const fileUrl = URL.createObjectURL(file);
      
      // Load the audio file into a Tone.js buffer
      const buffer = await Tone.Buffer.fromUrl(fileUrl);
      
      // Call the callback with the loaded buffer and file
      onAudioLoaded(buffer, file);
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [onAudioLoaded]);
```

This component:
1. Creates a file input for audio uploads
2. Validates that the selected file is an audio file
3. Loads the audio file into a Tone.js buffer
4. Calls back to the parent component with the loaded buffer and file

The UI provides visual feedback on the loading state and any errors that occur during loading.

### AudioPlayer Component

The AudioPlayer component is the heart of our application. It handles audio playback and all the audio processing effects. Let's break it down into sections:

#### State Management

```tsx
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
  const [pitchValue, setPitchValue] = useState(0);
  const [speedControlEnabled, setSpeedControlEnabled] = useState(false);
  const [speedValue, setSpeedValue] = useState(1.0); 
  const [bassBoostEnabled, setBassBoostEnabled] = useState(false);
  const [bassBoostAmount, setBassBoostAmount] = useState(6);
```

We use React's useState and useRef hooks to manage:
- Audio element and Web Audio API nodes
- Playback state (playing, duration, current time)
- Effect states (enabled/disabled and parameter values)

#### PitchShifter Class

One of the more complex effects is pitch shifting. We implement a custom PitchShifter class:

```tsx
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

  // Other methods: setActive, processAudio, connect, disconnect
}
```

This class implements a basic pitch shifting algorithm using a ScriptProcessorNode to manipulate audio samples in real-time.

#### Audio Graph Setup

In the useEffect hook, we set up the Web Audio API graph:

```tsx
useEffect(() => {
  const url = URL.createObjectURL(audioFile);
  const audio = new Audio(url);
  audioRef.current = audio;
  
  // Create Audio Context
  const audioContext = new AudioContext();
  audioContextRef.current = audioContext;
  
  // Create nodes
  const sourceNode = audioContext.createMediaElementSource(audio);
  const gainNode = audioContext.createGain();
  const dryGainNode = audioContext.createGain();
  const wetGainNode = audioContext.createGain();
  const convolverNode = audioContext.createConvolver();
  const pitchShifter = new PitchShifter(audioContext);
  const bassBoostNode = audioContext.createBiquadFilter();
  
  // Store references
  sourceNodeRef.current = sourceNode;
  gainNodeRef.current = gainNode;
  dryGainNodeRef.current = dryGainNode;
  wetGainNodeRef.current = wetGainNode;
  convolverNodeRef.current = convolverNode;
  pitchShifterRef.current = pitchShifter;
  bassBoostNodeRef.current = bassBoostNode;
  
  // Configure nodes
  bassBoostNode.type = 'lowshelf';
  bassBoostNode.frequency.value = 150;
  
  // Load impulse response for reverb
  fetch('/impulse-responses/hall.wav')
    .then(response => response.arrayBuffer())
    .then(buffer => audioContext.decodeAudioData(buffer))
    .then(decodedBuffer => {
      convolverNode.buffer = decodedBuffer;
    });
  
  // Connect nodes
  sourceNode.connect(gainNode);
  // ... more connections ...
  
  // Set up event listeners
  audio.addEventListener('loadedmetadata', onMetadata);
  audio.addEventListener('timeupdate', onTimeUpdate);
  audio.addEventListener('ended', onEnded);
  
  // Initial state setup
  updateReverbMix(reverbMix, reverbEnabled);
  pitchShifter.setActive(pitchShiftEnabled);
  
  // Cleanup function
  return () => {
    // Remove event listeners, disconnect nodes, etc.
  };
}, [audioFile]);
```

This sets up the audio processing chain including:
1. Creating an AudioContext and audio processing nodes
2. Loading the reverb impulse response
3. Connecting the nodes to form the processing chain
4. Setting up event listeners for audio playback

#### Effect Controls

The component includes handlers for each audio effect:

```tsx
const updateReverbMix = (mix: number, enabled: boolean) => {
  if (!dryGainNodeRef.current || !wetGainNodeRef.current) return;
  
  if (enabled) {
    dryGainNodeRef.current.gain.value = 1 - mix;
    wetGainNodeRef.current.gain.value = mix;
  } else {
    dryGainNodeRef.current.gain.value = 1;
    wetGainNodeRef.current.gain.value = 0;
  }
};

const toggleReverb = () => {
  setReverbEnabled(!reverbEnabled);
};

const togglePitchShift = () => {
  setPitchShiftEnabled(!pitchShiftEnabled);
};

// More effect handlers...
```

#### UI Rendering

The UI provides controls for playback and all effects:

```tsx
return (
  <div className="w-full max-w-2xl mx-auto bg-white shadow-md rounded-lg">
    <div className="p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Audio Player</h2>
      
      {/* Waveform and progress display */}
      <div className="mb-6">
        <div className="relative w-full h-20 mb-2 bg-gray-100 rounded-lg overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-indigo-500 opacity-50 transition-all duration-100"
            style={{ width: `${seekValue}%` }}
          />
        </div>
        <input
          type="range"
          value={seekValue}
          onChange={handleSeek}
          className="w-full"
        />
        <div className="flex justify-between">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      
      {/* Effects Controls */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3>Effects</h3>
        
        {/* Reverb Control */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label>Reverb</label>
            <button onClick={toggleReverb}>
              {/* Toggle button UI */}
            </button>
          </div>
          
          {reverbEnabled && (
            <input
              type="range"
              value={reverbMix}
              onChange={handleReverbMixChange}
            />
          )}
        </div>
        
        {/* More effect controls... */}
      </div>
      
      {/* Playback controls */}
      <div className="flex items-center justify-between">
        <button onClick={togglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        
        <div className="flex items-center">
          <button onClick={() => setVolume(Math.max(0, volume - 0.1))}>
            Volume -
          </button>
          <div>{Math.round(volume * 100)}%</div>
          <button onClick={() => setVolume(Math.min(1, volume + 0.1))}>
            Volume +
          </button>
        </div>
      </div>
    </div>
  </div>
);
```

## Key Technical Concepts

### Web Audio API

This project leverages the Web Audio API, which provides a powerful system for controlling audio on the web. The API allows us to:

1. Create an audio processing graph with nodes for different audio operations
2. Connect these nodes to form a processing chain
3. Apply effects like filters, convolution (reverb), and gain control

### Audio Effect Implementation

#### Reverb
Implemented using a ConvolverNode with an impulse response file. The mix between dry (unprocessed) and wet (processed) signals is controlled with gain nodes.

#### Pitch Shifting
Implemented with a custom PitchShifter class using a ScriptProcessorNode. The algorithm resamples audio data to achieve pitch shifting.

#### Speed Control
Implemented by adjusting the playbackRate property of the HTML Audio element.

#### Bass Boost
Implemented using a BiquadFilterNode with a 'lowshelf' type, which boosts frequencies below a specified cutoff.

## Conclusion

This audio processing application demonstrates several advanced web audio concepts:

1. Loading and playing audio files in the browser
2. Creating a complex audio processing chain with the Web Audio API
3. Implementing real-time audio effects
4. Building an intuitive UI for audio manipulation

The modular design allows for easy extension with additional audio effects in the future. The combination of React for UI and the Web Audio API for audio processing creates a powerful and flexible platform for audio manipulation in the browser. 