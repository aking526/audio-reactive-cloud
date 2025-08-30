/*
import { Scene } from "@/components/Scene";
import { ControlPanel } from "@/components/ControlPanel";
import { PresenceStrip } from "@/components/PresenceStrip";
import { use } from "react";

export default function RoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  
  return (
    <div className="h-screen flex flex-col">
      <PresenceStrip roomSlug={slug} />
      
      <div className="flex-1 flex flex-col lg:flex-row">
        <div className="flex-1 relative">
          <Scene pointCount={15000} pointSize={0.8} />
        </div>
        
        <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border">
          <ControlPanel />
        </div>
      </div>
    </div>
  );
}
*/
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';

export default function RoomFeatureDisabled() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
      <div className="text-center p-8 max-w-md mx-auto">
        <Construction className="h-16 w-16 text-primary mx-auto mb-6" />
        <h1 className="text-3xl font-bold mb-3">Feature Under Construction</h1>
        <p className="text-muted-foreground mb-8">
          The 3D Collaborative Rooms feature is temporarily disabled. We're working on something new and exciting!
        </p>
        <Link href="/dashboard">
          <Button>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Return to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}