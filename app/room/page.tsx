/*
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RoomSelection() {
  const [roomSlug, setRoomSlug] = useState("");
  const router = useRouter();

  const handleJoinRoom = () => {
    if (roomSlug.trim()) {
      router.push(`/room/${roomSlug.trim()}`);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleJoinRoom();
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-muted">
      <nav className="w-full border-b border-b-foreground/10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex justify-between items-center p-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <div className="flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-2xl space-y-6">
          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                3D Collaborative Rooms
              </CardTitle>
              <CardDescription>
                Enter a room name to create or join a shared 3D experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div className="space-y-2">
                  <label htmlFor="room-name" className="text-sm font-medium">
                    Room Name
                  </label>
                  <Input
                    id="room-name"
                    type="text"
                    placeholder="Enter room name (e.g., my-studio, team-session)..."
                    value={roomSlug}
                    onChange={(e) => setRoomSlug(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Room names are case-insensitive and will be converted to lowercase
                  </p>
                </div>
                <Button 
                  onClick={handleJoinRoom} 
                  disabled={!roomSlug.trim()}
                  className="w-full"
                  size="lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  {roomSlug.trim() ? `Join "${roomSlug.trim()}"` : 'Enter Room Name'}
                </Button>
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-semibold mb-3">What are 3D Collaborative Rooms?</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• <strong>Real-time collaboration:</strong> Work with others in shared audio spaces</p>
                  <p>• <strong>3D audio environment:</strong> Experience spatial audio and visual effects</p>
                  <p>• <strong>Easy sharing:</strong> Anyone with the room name can join your session</p>
                  <p>• <strong>Persistent rooms:</strong> Rooms stay active as long as someone is connected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
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