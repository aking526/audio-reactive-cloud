import { useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';

interface AudioUploaderProps {
  onAudioLoaded: (buffer: Tone.ToneAudioBuffer, file: File) => void;
}

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
      const buffer = await Tone.Buffer.fromUrl(fileUrl).catch((err) => {
        throw new Error(`Failed to load audio: ${err.message}`);
      });
      
      // We will create a new URL for playback later; don't revoke yet
      
      // Call the callback with the loaded buffer and file
      onAudioLoaded(buffer, file);
      
      setIsLoading(false);
    } catch (err) {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  }, [onAudioLoaded]);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white shadow-md rounded-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload Audio File</h2>
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors duration-200"
             onClick={triggerFileInput}>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="audio/*"
            className="hidden"
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-500 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-600">Loading audio...</p>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center justify-center">
              <svg className="h-8 w-8 text-green-500 mb-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-gray-800 font-medium">{fileName}</p>
              <p className="text-gray-500 text-sm mt-1">Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center">
              <svg className="h-12 w-12 text-gray-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <p className="text-gray-600 mb-2">Drag and drop your audio file here or click to browse</p>
              <p className="text-gray-500 text-sm">Supported formats: MP3, WAV, OGG, etc.</p>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg">
            <p>{error}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioUploader; 