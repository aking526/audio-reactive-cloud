"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, Eye, Settings2 } from "lucide-react";

export interface VisualizerSettings {
  mode: 'circular' | 'linear' | 'sphere';
  sensitivity: number;
  colorScheme: 'rainbow' | 'blue' | 'fire' | 'ocean';
  autoRotate: boolean;
  showVolume: boolean;
}

interface VisualizerControlsProps {
  settings: VisualizerSettings;
  onSettingsChange: (settings: VisualizerSettings) => void;
  isPlaying: boolean;
}

export default function VisualizerControls({ 
  settings, 
  onSettingsChange, 
  isPlaying 
}: VisualizerControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleModeChange = (mode: string) => {
    onSettingsChange({
      ...settings,
      mode: mode as 'circular' | 'linear' | 'sphere'
    });
  };

  const handleSensitivityChange = (value: number[]) => {
    onSettingsChange({
      ...settings,
      sensitivity: value[0]
    });
  };

  const handleColorSchemeChange = (scheme: string) => {
    onSettingsChange({
      ...settings,
      colorScheme: scheme as 'rainbow' | 'blue' | 'fire' | 'ocean'
    });
  };

  const toggleAutoRotate = () => {
    onSettingsChange({
      ...settings,
      autoRotate: !settings.autoRotate
    });
  };

  const toggleVolumeDisplay = () => {
    onSettingsChange({
      ...settings,
      showVolume: !settings.showVolume
    });
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Eye className="h-4 w-4" />
          Visualizer Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Visualization Mode */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Visualization Mode</label>
          <Select value={settings.mode} onValueChange={handleModeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="circular">Circular Waveform</SelectItem>
              <SelectItem value="linear">Linear Bars</SelectItem>
              <SelectItem value="sphere">3D Sphere</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sensitivity */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Sensitivity</label>
            <span className="text-xs text-muted-foreground">
              {settings.sensitivity.toFixed(1)}x
            </span>
          </div>
          <Slider
            value={[settings.sensitivity]}
            onValueChange={handleSensitivityChange}
            min={0.1}
            max={3.0}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Color Scheme */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-3 w-3" />
            Color Scheme
          </label>
          <Select value={settings.colorScheme} onValueChange={handleColorSchemeChange}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rainbow">🌈 Rainbow</SelectItem>
              <SelectItem value="blue">🔵 Ocean Blue</SelectItem>
              <SelectItem value="fire">🔥 Fire</SelectItem>
              <SelectItem value="ocean">🌊 Ocean</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick toggles */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={settings.autoRotate ? "default" : "outline"}
            size="sm"
            onClick={toggleAutoRotate}
            disabled={!isPlaying}
          >
            Auto Rotate
            {settings.autoRotate && <Badge variant="secondary" className="ml-2 text-xs">ON</Badge>}
          </Button>
          
          <Button
            variant={settings.showVolume ? "default" : "outline"}
            size="sm"
            onClick={toggleVolumeDisplay}
          >
            Volume Display
            {settings.showVolume && <Badge variant="secondary" className="ml-2 text-xs">ON</Badge>}
          </Button>
        </div>

        {/* Advanced Settings Toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full justify-center"
        >
          <Settings2 className="h-3 w-3 mr-2" />
          {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
        </Button>

        {showAdvanced && (
          <div className="space-y-3 p-3 bg-muted/30 rounded-lg border">
            <div className="text-xs text-muted-foreground">
              Advanced settings for fine-tuning the visualization
            </div>
            
            {/* Placeholder for future advanced controls */}
            <div className="space-y-2">
              <label className="text-sm font-medium">FFT Size</label>
              <div className="text-xs text-muted-foreground">
                Currently: 2048 samples (optimal for real-time performance)
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Smoothing</label>
              <div className="text-xs text-muted-foreground">
                Currently: 0.8 (balanced smoothing for natural motion)
              </div>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="pt-2 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Status:</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-green-400' : 'bg-gray-400'}`} />
              <span>{isPlaying ? 'Live Audio Reactive' : 'Audio Paused'}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}