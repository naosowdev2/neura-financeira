import { useMemo } from 'react';

const AtmosphericOverlay = () => {
  // Generate consistent particle positions with parallax effect
  // Larger particles = slower movement (closer), smaller = faster (farther)
  const particles = useMemo(() => 
    [...Array(20)].map((_, i) => {
      // Size determines depth layer: 1-2px = far, 3-4px = mid, 5-6px = close
      const sizeCategory = i % 3; // 0=far, 1=mid, 2=close
      const size = sizeCategory === 0 ? 1 + (i % 2) : sizeCategory === 1 ? 3 + (i % 2) : 5 + (i % 2);
      
      // Parallax: smaller/farther particles move faster with more distance
      const baseDuration = sizeCategory === 0 ? 12 : sizeCategory === 1 ? 22 : 35;
      const moveDistance = sizeCategory === 0 ? 120 : sizeCategory === 1 ? 60 : 25;
      
      // Opacity based on depth (farther = dimmer)
      const baseOpacity = sizeCategory === 0 ? 0.15 : sizeCategory === 1 ? 0.25 : 0.4;
      
      return {
        id: i,
        size,
        left: (i * 17 + 3) % 94,
        top: (i * 19 + 8) % 88,
        duration: baseDuration + (i % 4) * 3,
        delay: i * 0.6,
        moveDistance,
        baseOpacity,
        sizeCategory,
        hasGlow: sizeCategory === 2 && i % 4 === 0
      };
    }), []
  );

  return (
    <div 
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Central glow at bottom */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 60% 40% at 50% 100%, rgba(139, 92, 246, 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 50% 100%, rgba(99, 102, 241, 0.10) 0%, transparent 50%)
          `
        }}
      />

      {/* Floating particles with parallax */}
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            left: `${particle.left}%`,
            top: `${particle.top}%`,
            backgroundColor: particle.hasGlow 
              ? 'rgba(139, 92, 246, 0.5)' 
              : `rgba(255, 255, 255, ${particle.baseOpacity})`,
            boxShadow: particle.hasGlow 
              ? '0 0 12px rgba(139, 92, 246, 0.6)' 
              : 'none',
            animation: `particleFloat${particle.sizeCategory} ${particle.duration}s ease-in-out infinite`,
            animationDelay: `${particle.delay}s`,
            // CSS custom properties for dynamic animation
            ['--move-distance' as string]: `${particle.moveDistance}px`
          }}
        />
      ))}
      
      {/* Perspective grid container */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[80vh]"
        style={{ 
          perspective: '800px',
          perspectiveOrigin: '50% 0%'
        }}
      >
        {/* Grid plane with animation */}
        <div 
          className="absolute inset-0"
          style={{
            transform: 'rotateX(65deg)',
            transformOrigin: 'center top',
            background: `
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 49px,
                rgba(255, 255, 255, 0.12) 49px,
                rgba(255, 255, 255, 0.12) 50px
              ),
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 49px,
                rgba(255, 255, 255, 0.12) 49px,
                rgba(255, 255, 255, 0.12) 50px
              )
            `,
            backgroundSize: '50px 50px',
            maskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, black 20%, transparent 100%)',
            animation: 'gridFlow 20s linear infinite'
          }}
        />
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes gridFlow {
          0% { background-position: 0 0; }
          100% { background-position: 50px 50px; }
        }
        
        /* Far particles (small, fast, large movement) */
        @keyframes particleFloat0 {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
            opacity: 0.1; 
          }
          20% { 
            transform: translateY(-100px) translateX(30px); 
            opacity: 0.2; 
          }
          50% { 
            transform: translateY(-60px) translateX(-25px); 
            opacity: 0.15; 
          }
          80% { 
            transform: translateY(-120px) translateX(40px); 
            opacity: 0.18; 
          }
        }
        
        /* Mid particles (medium, moderate speed) */
        @keyframes particleFloat1 {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
            opacity: 0.2; 
          }
          33% { 
            transform: translateY(-50px) translateX(-18px); 
            opacity: 0.35; 
          }
          66% { 
            transform: translateY(-30px) translateX(22px); 
            opacity: 0.25; 
          }
        }
        
        /* Close particles (large, slow, subtle movement) */
        @keyframes particleFloat2 {
          0%, 100% { 
            transform: translateY(0) translateX(0); 
            opacity: 0.35; 
          }
          50% { 
            transform: translateY(-20px) translateX(-8px); 
            opacity: 0.5; 
          }
        }
      `}</style>
    </div>
  );
};

export default AtmosphericOverlay;
