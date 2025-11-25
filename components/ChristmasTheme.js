'use client';

import { useEffect, useState } from 'react';

/**
 * Composant de thème de Noël
 * - Neige animée qui tombe
 * - Peut être facilement désactivé après les fêtes
 */
export default function ChristmasTheme() {
  const [snowflakes, setSnowflakes] = useState([]);

  useEffect(() => {
    // Créer les flocons de neige
    const flakes = [];
    const numFlakes = 50; // Nombre de flocons

    for (let i = 0; i < numFlakes; i++) {
      flakes.push({
        id: i,
        left: Math.random() * 100, // Position horizontale en %
        animationDuration: 5 + Math.random() * 10, // Durée entre 5 et 15 secondes
        animationDelay: Math.random() * 5, // Délai aléatoire
        size: 0.5 + Math.random() * 1, // Taille entre 0.5 et 1.5rem
        opacity: 0.4 + Math.random() * 0.6, // Opacité entre 0.4 et 1
      });
    }

    setSnowflakes(flakes);
  }, []);

  return (
    <>
      {/* Container de neige */}
      <div className="christmas-snow-container">
        {snowflakes.map((flake) => (
          <div
            key={flake.id}
            className="snowflake"
            style={{
              left: `${flake.left}%`,
              animationDuration: `${flake.animationDuration}s`,
              animationDelay: `${flake.animationDelay}s`,
              fontSize: `${flake.size}rem`,
              opacity: flake.opacity,
            }}
          >
            ❄
          </div>
        ))}
      </div>

      {/* Styles CSS pour la neige */}
      <style jsx global>{`
        .christmas-snow-container {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9999;
          overflow: hidden;
        }

        .snowflake {
          position: absolute;
          top: -20px;
          color: white;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
          animation: snowfall linear infinite;
          user-select: none;
        }

        @keyframes snowfall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0.3;
          }
        }

        /* Chapeau de Noël sur le logo - via CSS */
        .christmas-hat {
          position: absolute;
          top: -15px;
          right: -5px;
          font-size: 1.2rem;
          transform: rotate(15deg);
          z-index: 10;
          filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.3));
        }

        /* Bordure festive en haut de la page */
        .christmas-border-top {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: repeating-linear-gradient(
            90deg,
            #c41e3a 0px,
            #c41e3a 20px,
            #228b22 20px,
            #228b22 40px
          );
          z-index: 10000;
        }

        /* Guirlandes lumineuses */
        .christmas-lights {
          position: fixed;
          top: 4px;
          left: 0;
          right: 0;
          height: 30px;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 30'%3E%3Ccircle cx='10' cy='15' r='5' fill='%23ff0000'/%3E%3Ccircle cx='30' cy='15' r='5' fill='%2300ff00'/%3E%3Ccircle cx='50' cy='15' r='5' fill='%23ffff00'/%3E%3Ccircle cx='70' cy='15' r='5' fill='%230000ff'/%3E%3Ccircle cx='90' cy='15' r='5' fill='%23ff00ff'/%3E%3C/svg%3E");
          background-repeat: repeat-x;
          background-size: 100px 30px;
          pointer-events: none;
          z-index: 9998;
          animation: twinkle 1.5s ease-in-out infinite alternate;
        }

        @keyframes twinkle {
          0% {
            opacity: 0.7;
          }
          100% {
            opacity: 1;
          }
        }
      `}</style>

      {/* Bordure festive */}
      <div className="christmas-border-top"></div>
      
      {/* Guirlandes */}
      <div className="christmas-lights"></div>
    </>
  );
}

/**
 * Composant pour ajouter un chapeau de Noël sur n'importe quel élément
 */
export function ChristmasHat({ className = '' }) {
  return (
    <span className={`christmas-hat ${className}`} role="img" aria-label="Chapeau de Noël">
      🎅
    </span>
  );
}

/**
 * Wrapper pour le logo avec chapeau de Noël
 */
export function ChristmasLogo({ children }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      {children}
      <ChristmasHat />
    </span>
  );
}

