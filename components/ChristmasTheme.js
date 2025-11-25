'use client';

import { useEffect, useState } from 'react';

/**
 * 🎄 Thème de Noël complet
 * - Neige réaliste
 * - Décorations festives
 */
export default function ChristmasTheme() {
  const [snowflakes, setSnowflakes] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const flakes = [];
    const numFlakes = 60;

    for (let i = 0; i < numFlakes; i++) {
      // Variation de types de flocons
      const types = ['❄', '❅', '❆', '✦', '•'];
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 10 + Math.random() * 15,
        animationDelay: Math.random() * 10,
        size: 8 + Math.random() * 16,
        opacity: 0.5 + Math.random() * 0.5,
        type: types[Math.floor(Math.random() * types.length)],
        swayAmount: 20 + Math.random() * 40,
      });
    }

    setSnowflakes(flakes);
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Neige qui tombe */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 9999,
          overflow: 'hidden',
        }}
      >
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            style={{
              position: 'absolute',
              top: '-30px',
              left: `${flake.left}%`,
              fontSize: `${flake.size}px`,
              opacity: flake.opacity,
              color: flake.type === '•' ? 'white' : '#e8f4ff',
              textShadow: '0 0 4px rgba(255, 255, 255, 0.9), 0 0 8px rgba(200, 220, 255, 0.6)',
              animation: `snowfall-${flake.id} ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
              userSelect: 'none',
              willChange: 'transform',
            }}
          >
            {flake.type}
          </div>
        ))}
      </div>

      {/* Bordure festive en haut */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        background: 'linear-gradient(90deg, #c41e3a 0%, #228b22 16%, #c41e3a 33%, #228b22 50%, #c41e3a 66%, #228b22 83%, #c41e3a 100%)',
        zIndex: 10001,
        boxShadow: '0 2px 8px rgba(196, 30, 58, 0.4)',
      }} />

      {/* Guirlande lumineuse subtile */}
      <div style={{
        position: 'fixed',
        top: '4px',
        left: 0,
        right: 0,
        height: '20px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        pointerEvents: 'none',
        zIndex: 10000,
      }}>
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: ['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#00ffff'][i % 5],
              boxShadow: `0 0 6px 2px ${['#ff0000', '#00ff00', '#ffff00', '#ff6600', '#00ffff'][i % 5]}`,
              animation: `twinkle ${0.5 + (i % 3) * 0.3}s ease-in-out infinite alternate`,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>

      {/* Coins décoratifs */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '15px',
        fontSize: '32px',
        opacity: 0.8,
        zIndex: 9998,
        pointerEvents: 'none',
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        animation: 'gentle-sway 4s ease-in-out infinite',
      }}>
        🎄
      </div>
      <div style={{
        position: 'fixed',
        bottom: '20px',
        right: '15px',
        fontSize: '32px',
        opacity: 0.8,
        zIndex: 9998,
        pointerEvents: 'none',
        filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))',
        animation: 'gentle-sway 4s ease-in-out infinite reverse',
      }}>
        🎁
      </div>

      {/* Styles des animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(0.8);
          }
        }
        
        @keyframes gentle-sway {
          0%, 100% {
            transform: rotate(-3deg) translateY(0);
          }
          50% {
            transform: rotate(3deg) translateY(-5px);
          }
        }
        
        ${snowflakes.map(flake => `
          @keyframes snowfall-${flake.id} {
            0% {
              transform: translateY(-30px) translateX(0px) rotate(0deg);
              opacity: ${flake.opacity};
            }
            25% {
              transform: translateY(25vh) translateX(${flake.swayAmount}px) rotate(90deg);
            }
            50% {
              transform: translateY(50vh) translateX(-${flake.swayAmount * 0.5}px) rotate(180deg);
            }
            75% {
              transform: translateY(75vh) translateX(${flake.swayAmount * 0.7}px) rotate(270deg);
            }
            100% {
              transform: translateY(100vh) translateX(0px) rotate(360deg);
              opacity: 0.1;
            }
          }
        `).join('\n')}
      `}</style>
    </>
  );
}

