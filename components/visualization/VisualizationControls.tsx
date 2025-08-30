import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VisualizationSettings } from './types';
import { Monitor, Circle } from 'lucide-react';

interface VisualizationControlsProps {
  settings: VisualizationSettings;
  onSettingsChange: (settings: Partial<VisualizationSettings>) => void;
  isActive: boolean;
}



export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  settings,
  onSettingsChange,
  isActive
}) => {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Monitor className="h-5 w-5" />
          Audio Visualization
          {isActive && <Badge variant="secondary">Active</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Visualization Display */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Visualization Type</label>
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <Circle className="h-4 w-4" />
            <span className="text-sm font-medium">Wave Sphere</span>
            <Badge variant="secondary" className="ml-auto">Active</Badge>
          </div>
        </div>

        {/* Sensitivity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Sensitivity: {settings.sensitivity.toFixed(1)}x</label>
          <Slider
            value={[settings.sensitivity]}
            onValueChange={(value) => onSettingsChange({ sensitivity: value[0] })}
            min={0.1}
            max={2}
            step={0.1}
            className="w-full"
          />
        </div>

        {/* Smoothing Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Smoothing: {(settings.smoothing * 100).toFixed(0)}%</label>
          <Slider
            value={[settings.smoothing]}
            onValueChange={(value) => onSettingsChange({ smoothing: value[0] })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Color Scheme Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Color Scheme</label>
          <Select
            value={settings.colorScheme}
            onValueChange={(value: 'rainbow' | 'fire' | 'ocean' | 'neon') => onSettingsChange({ colorScheme: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rainbow">Rainbow</SelectItem>
              <SelectItem value="fire">Fire</SelectItem>
              <SelectItem value="ocean">Ocean</SelectItem>
              <SelectItem value="neon">Neon</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quality Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Quality</label>
          <Select
            value={settings.quality}
            onValueChange={(value: 'low' | 'medium' | 'high' | 'ultra') => onSettingsChange({ quality: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low (Mobile)</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="ultra">Ultra</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Deformation Intensity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Deformation: {(settings.deformationIntensity * 100).toFixed(0)}%</label>
          <Slider
            value={[settings.deformationIntensity]}
            onValueChange={(value) => onSettingsChange({ deformationIntensity: value[0] })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Particle Intensity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Particles: {(settings.particleIntensity * 100).toFixed(0)}%</label>
          <Slider
            value={[settings.particleIntensity]}
            onValueChange={(value) => onSettingsChange({ particleIntensity: value[0] })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>

        {/* Glow Intensity Control */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Glow: {(settings.glowIntensity * 100).toFixed(0)}%</label>
          <Slider
            value={[settings.glowIntensity]}
            onValueChange={(value) => onSettingsChange({ glowIntensity: value[0] })}
            min={0}
            max={1}
            step={0.05}
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
};