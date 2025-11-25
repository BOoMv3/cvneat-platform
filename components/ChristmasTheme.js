'use client';

import { useEffect, useState } from 'react';

/**
 * Composant de thème de Noël - Version simplifiée
 * - Neige animée uniquement
 */
export default function ChristmasTheme() {
  const [snowflakes, setSnowflakes] = useState([]);

  useEffect(() => {
    const flakes = [];
    const numFlakes = 40;

    for (let i = 0; i < numFlakes; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100,
        animationDuration: 8 + Math.random() * 12,
        animationDelay: Math.random() * 8,
        size: 10 + Math.random() * 15,
        opacity: 0.6 + Math.random() * 0.4,
      });
    }

    setSnowflakes(flakes);
  }, []);

  return (
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
            top: '-20px',
            left: `${flake.left}%`,
            fontSize: `${flake.size}px`,
            opacity: flake.opacity,
            color: 'white',
            textShadow: '0 0 3px rgba(200, 220, 255, 0.8), 0 0 6px rgba(255, 255, 255, 0.5)',
            animation: `snowfall ${flake.animationDuration}s linear ${flake.animationDelay}s infinite`,
            userSelect: 'none',
          }}
        >
          ❄
        </div>
      ))}
      
      <style>{`
        @keyframes snowfall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0.2;
          }
        }
      `}</style>
    </div>
  );
}

