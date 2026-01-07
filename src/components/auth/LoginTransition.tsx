import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import neuraIcon from "@/assets/neura-icon.png";

interface LoginTransitionProps {
  onComplete: () => void;
  duration?: number;
}

export default function LoginTransition({ onComplete, duration = 2500 }: LoginTransitionProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const exitTimer = setTimeout(() => setIsExiting(true), duration - 500);
    const completeTimer = setTimeout(onComplete, duration);
    
    // Fallback de segurança: garantir que onComplete seja chamado
    const fallbackTimer = setTimeout(() => {
      onComplete();
    }, duration + 1000);
    
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
      clearTimeout(fallbackTimer);
    };
  }, [onComplete, duration]);

  // Floating particles positions
  const particles = [
    { x: -120, y: -80, delay: 0.8 },
    { x: 140, y: -60, delay: 0.9 },
    { x: -100, y: 100, delay: 1.0 },
    { x: 130, y: 90, delay: 1.1 },
    { x: -60, y: -140, delay: 1.2 },
    { x: 80, y: 130, delay: 1.3 },
  ];

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{ 
        background: "radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(220 30% 5%) 100%)"
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Ambient glow background */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)"
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.15 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* Energy rings */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2"
          style={{ 
            width: 180 + i * 80, 
            height: 180 + i * 80,
            borderColor: `hsl(var(--primary) / ${0.4 - i * 0.1})`
          }}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.8, 2.2],
            opacity: [0.6, 0.3, 0]
          }}
          transition={{ 
            duration: 1.8,
            delay: 0.5 + i * 0.25,
            ease: "easeOut",
            repeat: 1,
            repeatDelay: 0.3
          }}
        />
      ))}

      {/* Floating neural particles */}
      {particles.map((particle, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/60"
          style={{ boxShadow: "0 0 10px hsl(var(--primary))" }}
          initial={{ 
            x: 0, 
            y: 0, 
            opacity: 0,
            scale: 0
          }}
          animate={{ 
            x: particle.x,
            y: particle.y,
            opacity: [0, 0.8, 0.4],
            scale: [0, 1.2, 0.8]
          }}
          transition={{ 
            duration: 1.5,
            delay: particle.delay,
            ease: "easeOut"
          }}
        />
      ))}

      {/* Connecting lines between particles */}
      <svg className="absolute w-full h-full pointer-events-none" style={{ maxWidth: 400, maxHeight: 400 }}>
        {[
          { x1: "30%", y1: "35%", x2: "70%", y2: "40%" },
          { x1: "25%", y1: "60%", x2: "75%", y2: "55%" },
          { x1: "40%", y1: "25%", x2: "60%", y2: "75%" },
        ].map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke="hsl(var(--primary) / 0.3)"
            strokeWidth="1"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.5 }}
            transition={{ duration: 1, delay: 1 + i * 0.15 }}
          />
        ))}
      </svg>

      {/* Logo container with glow */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: isExiting ? 1.5 : 1, 
          rotate: 0,
          opacity: isExiting ? 0 : 1
        }}
        transition={{ 
          type: "spring",
          stiffness: 200,
          damping: 20,
          delay: 0.2
        }}
      >
        {/* Glow effect behind logo */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: "radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)",
            filter: "blur(20px)"
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ 
            opacity: [0.4, 0.8, 0.4],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* Logo image */}
        <motion.img
          src={neuraIcon}
          alt="Neura"
          className="w-24 h-24 rounded-full object-cover relative z-10"
          style={{
            boxShadow: "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)"
          }}
          animate={{
            boxShadow: [
              "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)",
              "0 0 60px hsl(var(--primary) / 0.7), 0 0 100px hsl(var(--primary) / 0.4)",
              "0 0 40px hsl(var(--primary) / 0.5), 0 0 80px hsl(var(--primary) / 0.3)"
            ]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Text container */}
      <motion.div 
        className="mt-8 text-center relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ 
          opacity: isExiting ? 0 : 1, 
          y: isExiting ? -20 : 0 
        }}
        transition={{ duration: 0.5, delay: 0.6 }}
      >
        {/* NeurIA text with gradient */}
        <motion.h1
          className="text-4xl font-bold"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 50%, hsl(var(--foreground)) 100%)",
            backgroundSize: "200% 200%",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: 0,
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
          }}
          transition={{ 
            opacity: { delay: 0.7, duration: 0.4 },
            y: { delay: 0.7, duration: 0.4 },
            backgroundPosition: { duration: 3, repeat: Infinity, ease: "easeInOut" }
          }}
        >
          NeurIA
        </motion.h1>

        {/* Financeira subtitle */}
        <motion.p
          className="text-xl text-primary/80 mt-1"
          style={{
            textShadow: "0 0 20px hsl(var(--primary) / 0.5)"
          }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.4 }}
        >
          Financeira
        </motion.p>

        {/* Loading indicator */}
        <motion.div
          className="mt-6 flex justify-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary/60"
              animate={{
                y: [0, -8, 0],
                opacity: [0.4, 1, 0.4]
              }}
              transition={{
                duration: 0.8,
                repeat: Infinity,
                delay: i * 0.15,
                ease: "easeInOut"
              }}
            />
          ))}
        </motion.div>
      </motion.div>

      {/* Final fade transition overlay - usando gradiente suave */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ 
          background: "radial-gradient(ellipse at center, hsl(var(--background)) 0%, hsl(var(--background)) 100%)"
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isExiting ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />
    </motion.div>
  );
}
