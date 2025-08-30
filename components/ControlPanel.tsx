"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export function ControlPanel() {
  return (
    <motion.div 
      className="h-full p-4 space-y-4 overflow-y-auto"
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Mode Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge variant="default">Ambient</Badge>
            <Badge variant="outline">Reactive</Badge>
            <Badge variant="outline">Synchronized</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Audio Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Audio Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Sensitivity</label>
            <div className="relative">
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-2 bg-primary rounded-full w-3/5"></div>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">60%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Warp</label>
            <div className="relative">
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-2 bg-primary rounded-full w-2/5"></div>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">40%</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Hue Shift</label>
            <div className="relative">
              <div className="w-full h-2 bg-muted rounded-full">
                <div className="h-2 bg-primary rounded-full w-1/3"></div>
              </div>
              <span className="text-xs text-muted-foreground mt-1 block">33%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Presets</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button variant="outline" className="w-full justify-start text-left">
            Ocean Waves
          </Button>
          <Button variant="outline" className="w-full justify-start text-left">
            Electric Storm
          </Button>
          <Button variant="outline" className="w-full justify-start text-left">
            Cosmic Dance
          </Button>
          <Button variant="ghost" className="w-full justify-start text-left text-muted-foreground">
            + Save Current
          </Button>
        </CardContent>
      </Card>

      {/* Performance */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Particles</span>
            <span className="text-muted-foreground">15,000</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>FPS</span>
            <span className="text-green-600">60</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}