"use client";

import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";



export default function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const router = useRouter();

  const handleNavigate = (path: string) => {
    setIsExiting(true);
    setTimeout(() => {
      router.push(path);
    }, 500); // Duration of exit animation
  };

  useEffect(() => {
    setIsLoaded(true);

    // Check if user is already authenticated and redirect if so
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          const { authenticated } = await response.json();
          if (authenticated) {
            router.push('/dashboard');
          }
        }
      } catch {
        // If there's an error checking auth, stay on landing page
        console.log('Auth check failed, staying on landing page');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <motion.main
      className="min-h-screen bg-gradient-to-br from-background via-background/95 to-muted/30 overflow-hidden relative"
      initial={{ opacity: 1 }}
      animate={{ opacity: isExiting ? 0 : 1 }}
      transition={{ ease: "easeInOut", duration: 0.5 }}
    >
      {/* Enhanced Shader Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dynamic gradient overlay */}
        <motion.div
          className="absolute inset-0 opacity-60"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 40% 80%, rgba(236, 72, 153, 0.15) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%)"
            ]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Large animated orbs */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.8, 0.4],
            x: [0, 50, 0],
            y: [0, -30, 0]
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-purple-500/15 to-pink-500/15 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 0.8, 1.2],
            opacity: [0.3, 0.7, 0.3],
            x: [0, -70, 0],
            y: [0, 40, 0]
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 w-80 h-80 bg-gradient-to-r from-pink-500/20 to-blue-500/20 rounded-full blur-3xl"
          animate={{
            scale: [0.8, 1.6, 0.8],
            opacity: [0.5, 0.9, 0.5],
            x: [0, 60, 0],
            y: [0, 50, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />

        {/* Particle-like effects */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-primary/40 rounded-full blur-sm"
            style={{
              left: `${15 + i * 10}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [0.5, 1.5, 0.5]
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.3,
              ease: "easeInOut"
            }}
          />
        ))}

        {/* Wave patterns */}
        <motion.div
          className="absolute bottom-0 left-0 w-full h-32 opacity-20"
          animate={{
            background: [
              "linear-gradient(45deg, transparent 30%, rgba(59, 130, 246, 0.1) 50%, transparent 70%)",
              "linear-gradient(45deg, transparent 20%, rgba(139, 92, 246, 0.1) 50%, transparent 80%)",
              "linear-gradient(45deg, transparent 30%, rgba(236, 72, 153, 0.1) 50%, transparent 70%)"
            ]
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      {/* Main Title - Centered and Extended */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-8">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={isLoaded ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold bg-gradient-to-r from-foreground via-primary to-secondary bg-clip-text text-transparent animate-gradient-x whitespace-nowrap"
          style={{
            fontStretch: 'ultra-expanded',
            letterSpacing: '0.05em',
            lineHeight: '1',
            transform: 'scaleX(1.05)',
            transformOrigin: 'center',
            width: 'fit-content',
            maxWidth: 'calc(100vw - 4rem)',
            textAlign: 'center'
          }}
        >
          AUDIO PROCESSING STUDIO
        </motion.h1>
      </div>

      {/* Bottom Right Button */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={isLoaded ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="fixed bottom-8 right-8 z-20"
      >
        <motion.div
          whileHover={{ scale: 1.04, y: -1 }}
          whileTap={{ scale: 0.98 }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
       >
          <Button
            onClick={() => handleNavigate("/auth/login")}
            size="lg"
            className="relative overflow-hidden group bg-primary/90 hover:bg-primary backdrop-blur-sm border border-primary/30 shadow-lg px-8 py-3 text-lg font-semibold"
          >
            <span className="relative z-10">Get Started</span>
            <span className="pointer-events-none absolute inset-y-0 -left-full w-1/2 bg-gradient-to-r from-transparent via-white/20 to-transparent transform group-hover:translate-x-[300%] transition-transform duration-700 ease-out" />
          </Button>
        </motion.div>
      </motion.div>
    </motion.main>
  );
}
