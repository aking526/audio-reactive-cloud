import { useState, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, Music, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface AudioUploaderProps {
  onAudioLoaded: (buffer: Tone.ToneAudioBuffer | null, file: File) => void;
}

const AudioUploader = ({ onAudioLoaded }: AudioUploaderProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (file: File) => {
    // Check if file is an audio file with more specific validation
    const validAudioTypes = [
      'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 
      'audio/aac', 'audio/flac', 'audio/webm', 'audio/mp4'
    ];
    
    const isValidAudioFile = file.type.startsWith('audio/') || 
                           validAudioTypes.includes(file.type) ||
                           /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(file.name);
    
    if (!isValidAudioFile) {
      setError(`Please upload an audio file. Uploaded: ${file.type || 'unknown type'} (${file.name})`);
      return;
    }

    setFileName(file.name);
    setIsLoading(true);
    setError(null);

    try {
      // First, let's validate the file can be loaded as an HTML Audio element
      const fileUrl = URL.createObjectURL(file);
      const testAudio = new Audio(fileUrl);
      
      await new Promise((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error(`Timeout loading audio file: ${file.name}. The file may be too large or corrupted.`));
        }, 10000);
        
        let hasLoaded = false;
        
        const handleSuccess = () => {
          if (!hasLoaded) {
            hasLoaded = true;
            clearTimeout(timeoutId);
            resolve(undefined);
          }
        };
        
        const handleError = (event: Event) => {
          if (!hasLoaded) {
            hasLoaded = true;
            clearTimeout(timeoutId);
            
            // Get more detailed error information
            const target = event.target as HTMLAudioElement;
            let errorMessage = `Invalid audio file: ${file.name}`;
            
            if (target.error) {
              switch(target.error.code) {
                case MediaError.MEDIA_ERR_DECODE:
                  errorMessage += '. The audio file appears to be corrupted or uses an unsupported encoding.';
                  break;
                case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
                  errorMessage += '. This audio format is not supported by your browser.';
                  break;
                case MediaError.MEDIA_ERR_NETWORK:
                  errorMessage += '. Network error while loading the file.';
                  break;
                case MediaError.MEDIA_ERR_ABORTED:
                  errorMessage += '. Loading was aborted.';
                  break;
                default:
                  errorMessage += '. Unknown audio error.';
              }
            }
            
            reject(new Error(errorMessage));
          }
        };
        
        // Listen for multiple success events
        testAudio.addEventListener('canplaythrough', handleSuccess);
        testAudio.addEventListener('canplay', handleSuccess);
        testAudio.addEventListener('loadeddata', handleSuccess);
        testAudio.addEventListener('error', handleError);
        
        // For WAV files, sometimes we need to be more patient
        if (file.name.toLowerCase().endsWith('.wav') || file.type === 'audio/wav') {
          console.log('Loading WAV file, using extended timeout...');
          clearTimeout(timeoutId);
          setTimeout(() => {
            if (!hasLoaded) {
              reject(new Error(`Timeout loading WAV file: ${file.name}. WAV files can take longer to load. Please try a smaller file or different format.`));
            }
          }, 15000); // Extended timeout for WAV files
        }
        
        testAudio.load();
      });
      
      // For now, let's skip Tone.js loading in the uploader and let the player handle it
      // This avoids the double-decoding issue
      onAudioLoaded(null, file);
      setIsLoading(false);
      
      // Clean up URL after successful validation
      URL.revokeObjectURL(fileUrl);
    } catch (err) {
      setIsLoading(false);
      setFileName(null); // Reset filename on error
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while processing the audio file';
      setError(errorMessage);
      console.error('Audio upload error:', err);
    }
  }, [onAudioLoaded]);

  const handleInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await handleFileChange(file);
  }, [handleFileChange]);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    
    if (files.length === 0) {
      setError('No files detected. Please try again.');
      return;
    }
    
    if (files.length > 1) {
      setError('Please drop only one audio file at a time.');
      return;
    }
    
    const file = files[0];
    await handleFileChange(file);
  }, [handleFileChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Upload Audio File
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200",
            isDragOver 
              ? "border-primary bg-primary/5" 
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
          )}
          onClick={triggerFileInput}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept="audio/*"
            className="hidden"
          />
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground">Loading audio...</p>
            </div>
          ) : fileName ? (
            <div className="flex flex-col items-center justify-center space-y-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <p className="font-medium text-foreground">{fileName}</p>
              <p className="text-sm text-muted-foreground">Click to change file</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-3">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div className="space-y-2">
                <p className="text-foreground">Drag and drop your audio file here or click to browse</p>
                <p className="text-sm text-muted-foreground">Supported formats: MP3, WAV, OGG, and more</p>
              </div>
              <Button variant="outline" size="sm">
                Browse Files
              </Button>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioUploader;