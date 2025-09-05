import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music, Play, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SampleSong, sampleSongsService } from '@/lib/supabase/sample-songs';

interface SampleSongSelectorProps {
  onSongSelected: (file: File) => void;
  isLoading?: boolean;
}

const SampleSongSelector = ({ onSongSelected, isLoading: externalLoading }: SampleSongSelectorProps) => {
  const [sampleSongs, setSampleSongs] = useState<SampleSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [loadingSong, setLoadingSong] = useState<string | null>(null);

  // Fetch sample songs on component mount
  useEffect(() => {
    const fetchSampleSongs = async () => {
      try {
        setLoading(true);
        setError(null);
        const songs = await sampleSongsService.getSampleSongs();
        setSampleSongs(songs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load sample songs');
        console.error('Error fetching sample songs:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSampleSongs();
  }, []);

  const handleSongSelect = useCallback(async (song: SampleSong) => {
    try {
      setLoadingSong(song.fullPath);
      setError(null);
      
      const file = await sampleSongsService.getSampleSongAsFile(song);
      setSelectedSong(song.fullPath);
      onSongSelected(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sample song');
      console.error('Error loading sample song:', err);
    } finally {
      setLoadingSong(null);
    }
  }, [onSongSelected]);

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Sample Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading sample songs...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && sampleSongs.length === 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Music className="h-5 w-5" />
            Sample Songs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 text-red-500 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button 
                variant="outline" 
                onClick={() => window.location.reload()}
              >
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5" />
          Sample Songs
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose from our collection of sample songs to get started quickly
        </p>
      </CardHeader>
      <CardContent>
        {sampleSongs.length === 0 ? (
          <div className="text-center py-8">
            <Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No sample songs available</p>
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {sampleSongs.map((song) => (
              <div
                key={song.fullPath}
                className={cn(
                  "flex items-center justify-between p-4 border rounded-lg transition-all duration-200 hover:bg-muted/50",
                  selectedSong === song.fullPath && "border-primary bg-primary/5",
                  (externalLoading || loadingSong === song.fullPath) && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    {selectedSong === song.fullPath ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <Play className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground truncate">
                      {song.name}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {sampleSongsService.formatFileSize(song.size)}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {song.fullPath.split('.').pop()?.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => handleSongSelect(song)}
                  disabled={externalLoading || loadingSong === song.fullPath || selectedSong === song.fullPath}
                  variant={selectedSong === song.fullPath ? "secondary" : "outline"}
                  size="sm"
                  className="flex-shrink-0"
                >
                  {loadingSong === song.fullPath ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : selectedSong === song.fullPath ? (
                    "Selected"
                  ) : (
                    "Select"
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}
        
        {error && sampleSongs.length > 0 && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SampleSongSelector;
