"use client";

import { motion } from "framer-motion";

interface PresenceStripProps {
  roomSlug: string;
}

interface ParticipantProps {
  name: string;
  initials: string;
  color: string;
  isActive: boolean;
}

function ParticipantAvatar({ name, initials, color, isActive }: ParticipantProps) {
  return (
    <div className="flex items-center gap-2">
      <div 
        className={`
          w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold
          ${isActive 
            ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-background' 
            : 'opacity-70'
          }
        `}
        style={{ backgroundColor: color }}
      >
        {initials}
      </div>
      <span className={`text-sm ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
        {name}
      </span>
    </div>
  );
}

export function PresenceStrip({ roomSlug }: PresenceStripProps) {
  // Mock participants data
  const participants = [
    { name: "You", initials: "YU", color: "#3b82f6", isActive: true },
    { name: "Alex Chen", initials: "AC", color: "#10b981", isActive: true },
    { name: "Sam Rivera", initials: "SR", color: "#f59e0b", isActive: false },
  ];

  return (
    <motion.div 
      className="border-b border-border bg-muted/30 px-4 py-3"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-muted-foreground">
            Room: <span className="text-foreground font-mono">{roomSlug}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-4">
            {participants.map((participant) => (
              <ParticipantAvatar
                key={participant.name}
                name={participant.name}
                initials={participant.initials}
                color={participant.color}
                isActive={participant.isActive}
              />
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">
              {participants.filter(p => p.isActive).length} active
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}