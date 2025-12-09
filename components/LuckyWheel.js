'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaGift, FaStar } from 'react-icons/fa';

// Vérifier si l'utilisateur a déjà joué pour une commande
const hasPlayedForOrder = (orderId) => {
  if (typeof window === 'undefined') return true;
  const played = JSON.parse(localStorage.getItem('luckyWheelPlayed') || '[]');
  return played.includes(orderId);
};

// Marquer une commande comme jouée
const markOrderAsPlayed = (orderId) => {
  if (typeof window === 'undefined') return;
  const played = JSON.parse(localStorage.getItem('luckyWheelPlayed') || '[]');
  if (!played.includes(orderId)) {
    played.push(orderId);
    // Garder seulement les 50 dernières commandes pour ne pas surcharger
    if (played.length > 50) played.shift();
    localStorage.setItem('luckyWheelPlayed', JSON.stringify(played));
  }
};

// Configuration des segments avec probabilités (total = 100%)
// 92% de chance de ne rien gagner !
const SEGMENTS = [
  { label: "Pas de chance", color: "#6b7280", probability: 45, prize: null },
  { label: "Réessayez !", color: "#9ca3af", probability: 30, prize: null },
  { label: "Presque...", color: "#d1d5db", probability: 17, prize: null },
  { label: "-10%", color: "#fbbf24", probability: 4, prize: { type: 'discount', value: 10, code: 'CHANCE10' } },
  { label: "Livraison offerte", color: "#f97316", probability: 2.5, prize: { type: 'free_delivery', code: 'CHANCEFREE' } },
  { label: "Dessert offert", color: "#ef4444", probability: 1, prize: { type: 'free_dessert', code: 'CHANCEDESSERT' } },
  { label: "-50% !", color: "#10b981", probability: 0.4, prize: { type: 'discount', value: 50, code: 'CHANCE50' } },
  { label: "🎉 JACKPOT", color: "#8b5cf6", probability: 0.1, prize: { type: 'free_order', code: 'JACKPOT' } },
];

// Calculer les angles des segments
const calculateSegments = () => {
  let currentAngle = 0;
  return SEGMENTS.map(segment => {
    const angle = (segment.probability / 100) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;
    return { ...segment, startAngle, endAngle: currentAngle, angle };
  });
};

const segmentsWithAngles = calculateSegments();

// Fonction pour déterminer le résultat basé sur les probabilités
const spinWheel = () => {
  const random = Math.random() * 100;
  let cumulative = 0;
  
  for (const segment of SEGMENTS) {
    cumulative += segment.probability;
    if (random <= cumulative) {
      return segment;
    }
  }
  return SEGMENTS[0]; // Fallback
};

export default function LuckyWheel({ isOpen, onClose, onWin, orderId }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const wheelRef = useRef(null);

  // Vérifier si déjà joué pour cette commande
  useEffect(() => {
    if (orderId) {
      setAlreadyPlayed(hasPlayedForOrder(orderId));
    }
  }, [orderId]);

  const handleSpin = () => {
    if (isSpinning || alreadyPlayed) return;
    
    setIsSpinning(true);
    setResult(null);
    
    // Marquer comme joué immédiatement
    if (orderId) {
      markOrderAsPlayed(orderId);
      setAlreadyPlayed(true);
    }
    
    // Déterminer le résultat
    const winner = spinWheel();
    
    // Calculer l'angle pour atterrir sur ce segment
    const segmentWithAngle = segmentsWithAngles.find(s => s.label === winner.label);
    const segmentMiddle = segmentWithAngle.startAngle + (segmentWithAngle.angle / 2);
    
    // Rotation : plusieurs tours + angle pour atterrir sur le segment
    // La flèche est en haut, donc on ajuste
    const targetAngle = 360 - segmentMiddle + 90; // +90 car la flèche est en haut
    const spins = 5 + Math.floor(Math.random() * 3); // 5-7 tours
    const totalRotation = rotation + (spins * 360) + targetAngle;
    
    setRotation(totalRotation);
    
    // Après l'animation, afficher le résultat
    setTimeout(() => {
      setIsSpinning(false);
      setResult(winner);
      
      if (winner.prize && onWin) {
        onWin(winner);
      }
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 relative overflow-hidden">
        {/* Confettis décoratifs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          <div className="absolute top-4 left-4 text-2xl animate-bounce">🎉</div>
          <div className="absolute top-8 right-8 text-xl animate-bounce delay-100">✨</div>
          <div className="absolute bottom-20 left-8 text-xl animate-bounce delay-200">🎁</div>
          <div className="absolute bottom-16 right-4 text-2xl animate-bounce delay-300">⭐</div>
        </div>
        
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
        >
          <FaTimes />
        </button>
        
        {/* Titre */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-black text-gray-800 mb-1">
            🎰 Roue de la Chance
          </h2>
          <p className="text-gray-500 text-sm">
            Tentez votre chance et gagnez des récompenses !
          </p>
        </div>
        
        {/* Roue */}
        <div className="relative w-64 h-64 mx-auto mb-6">
          {/* Flèche indicateur */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
            <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[25px] border-t-orange-500 drop-shadow-lg" />
          </div>
          
          {/* Roue SVG */}
          <svg
            ref={wheelRef}
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-xl"
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none'
            }}
          >
            {segmentsWithAngles.map((segment, index) => {
              const startRad = (segment.startAngle - 90) * (Math.PI / 180);
              const endRad = (segment.endAngle - 90) * (Math.PI / 180);
              const x1 = 100 + 95 * Math.cos(startRad);
              const y1 = 100 + 95 * Math.sin(startRad);
              const x2 = 100 + 95 * Math.cos(endRad);
              const y2 = 100 + 95 * Math.sin(endRad);
              const largeArc = segment.angle > 180 ? 1 : 0;
              
              // Position du texte
              const midAngle = ((segment.startAngle + segment.endAngle) / 2 - 90) * (Math.PI / 180);
              const textX = 100 + 60 * Math.cos(midAngle);
              const textY = 100 + 60 * Math.sin(midAngle);
              const textRotation = (segment.startAngle + segment.endAngle) / 2;
              
              return (
                <g key={index}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={segment.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize={segment.label.length > 10 ? "6" : "8"}
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                    style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
            {/* Centre de la roue */}
            <circle cx="100" cy="100" r="20" fill="#1f2937" />
            <circle cx="100" cy="100" r="15" fill="#374151" />
            <text x="100" y="100" fill="white" fontSize="10" textAnchor="middle" dominantBaseline="middle">
              GO
            </text>
          </svg>
        </div>
        
        {/* Résultat */}
        {result && (
          <div className={`text-center mb-4 p-4 rounded-2xl ${result.prize ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'}`}>
            {result.prize ? (
              <>
                <div className="text-3xl mb-2">🎉</div>
                <p className="font-bold text-green-600 text-lg">Félicitations !</p>
                <p className="text-green-700">Vous avez gagné : <strong>{result.label}</strong></p>
                <p className="text-sm text-green-600 mt-2">
                  Code : <span className="font-mono bg-green-100 px-2 py-1 rounded">{result.prize.code}</span>
                </p>
              </>
            ) : (
              <>
                <div className="text-3xl mb-2">😅</div>
                <p className="font-bold text-gray-600">{result.label}</p>
                <p className="text-gray-500 text-sm">Peut-être la prochaine fois !</p>
              </>
            )}
          </div>
        )}
        
        {/* Bouton tourner */}
        {alreadyPlayed && !result ? (
          <div className="text-center p-4 bg-gray-100 rounded-2xl">
            <p className="text-gray-600 font-medium">😅 Vous avez déjà joué pour cette commande !</p>
            <p className="text-gray-400 text-sm mt-1">Revenez après votre prochaine commande</p>
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={isSpinning || (alreadyPlayed && !result)}
            className={`w-full py-4 rounded-2xl font-bold text-lg transition-all ${
              isSpinning || alreadyPlayed
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600 transform hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            {isSpinning ? '🎰 La roue tourne...' : '🎰 Tourner la roue !'}
          </button>
        )}
        
        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-400 mt-4">
          1 chance par commande • Les lots sont valables 7 jours
        </p>
      </div>
    </div>
  );
}

