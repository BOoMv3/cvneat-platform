'use client';

import { useEffect, useState } from 'react';
/**
 * Skin Coupe du Monde — effets globaux (ballons, confettis, lumières stade)
 */
export default function WorldCupTheme() {
  const [balls, setBalls] = useState([]);
  const [confetti, setConfetti] = useState([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setBalls(
      Array.from({ length: 14 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 18 + Math.random() * 28,
        duration: 14 + Math.random() * 18,
        delay: Math.random() * 12,
        drift: 30 + Math.random() * 50,
      }))
    );
    setConfetti(
      Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: ['#fbbf24', '#22c55e', '#3b82f6', '#ffffff', '#ef4444'][i % 5],
        duration: 6 + Math.random() * 8,
        delay: Math.random() * 8,
        size: 4 + Math.random() * 6,
      }))
    );
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* Bandeau stade en haut */}
      <div className="wc-stadium-lights" aria-hidden="true" />

      {/* Ligne terrain */}
      <div className="wc-pitch-line" aria-hidden="true" />

      {/* Ballons flottants */}
      <div className="wc-floating-layer" aria-hidden="true">
        {balls.map((ball) => (
          <div
            key={ball.id}
            className="wc-floating-ball"
            style={{
              left: `${ball.left}%`,
              width: ball.size,
              height: ball.size,
              animationDuration: `${ball.duration}s`,
              animationDelay: `${ball.delay}s`,
              '--wc-drift': `${ball.drift}px`,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/world-cup/world-cup-ball.png"
              alt=""
              width={ball.size}
              height={ball.size}
              className="w-full h-full object-contain drop-shadow-lg wc-png-nobg"
              draggable={false}
            />
          </div>
        ))}
      </div>

      {/* Confettis */}
      <div className="wc-confetti-layer" aria-hidden="true">
        {confetti.map((c) => (
          <span
            key={c.id}
            className="wc-confetti"
            style={{
              left: `${c.left}%`,
              backgroundColor: c.color,
              width: c.size,
              height: c.size * 1.6,
              animationDuration: `${c.duration}s`,
              animationDelay: `${c.delay}s`,
            }}
          />
        ))}
      </div>

      {/* Trophées coins */}
      <div className="wc-corner-trophy wc-corner-trophy--left" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/world-cup/world-cup-trophy.png" alt="" width={72} height={72} className="wc-png-nobg" draggable={false} />
      </div>
      <div className="wc-corner-trophy wc-corner-trophy--right" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/world-cup/world-cup-trophy.png" alt="" width={72} height={72} className="wc-png-nobg" draggable={false} />
      </div>
    </>
  );
}
