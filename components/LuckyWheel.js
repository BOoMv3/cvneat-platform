'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaGift, FaStar } from 'react-icons/fa';

// Son de roulette (utilise l'API Web Audio)
const playWheelSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 200;
    oscillator.type = 'square';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 4);
  } catch (error) {
    console.log('Son désactivé:', error);
  }
};

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

// Configuration des segments - 4 gains uniquement
// Chaque segment = 25% (4 segments égaux)
const SEGMENTS = [
  { label: "Livraison offerte", color: "#f97316", visualSize: 25, probability: 25, prize: { type: 'free_delivery', value: 0 } },
  { label: "Boisson offerte", color: "#3b82f6", visualSize: 25, probability: 25, prize: { type: 'free_drink', value: 0 } },
  { label: "-10%", color: "#fbbf24", visualSize: 25, probability: 25, prize: { type: 'discount', value: 10 } },
  { label: "🎁 Surprise", color: "#8b5cf6", visualSize: 25, probability: 25, prize: { type: 'surprise', value: 0 } },
];

// Total = 100% de gains, 4 options équilibrées

// Calculer les angles des segments (basé sur visualSize pour l'affichage)
const calculateSegments = () => {
  let currentAngle = 0;
  return SEGMENTS.map(segment => {
    const angle = (segment.visualSize / 100) * 360; // Utilise visualSize pour l'affichage
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

export default function LuckyWheel({ isOpen, onClose, onWin, orderId, userId }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);
  const [generatedCode, setGeneratedCode] = useState(null);
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
    
    // Jouer le son de roulette
    playWheelSound();
    
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
    
    // Après l'animation, afficher le résultat et générer le code promo
    setTimeout(async () => {
      setIsSpinning(false);
      setResult(winner);
      
      // Générer un code promo automatiquement si l'utilisateur a gagné
      if (winner.prize && userId) {
        console.log('🎰 Génération code promo pour:', {
          userId,
          prizeType: winner.prize.type,
          prizeValue: winner.prize.value,
          orderId,
          label: winner.label
        });
        
        try {
          const response = await fetch('/api/promo-codes/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              prizeType: winner.prize.type,
              prizeValue: winner.prize.value,
              orderId
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const data = await response.json();
          console.log('📦 Réponse API génération code:', data);
          
          if (data.success) {
            // Pour "boisson offerte", il n'y a pas de code promo
            if (data.prizeType === 'free_drink') {
              setGeneratedCode('BOISSON_OFFERTE'); // Marqueur spécial
            } else if (data.code) {
              // Pour les autres gains, on a un code promo
              setGeneratedCode(data.code);
            } else {
              console.error('❌ Pas de code retourné pour:', data.prizeType);
            }
            
            // Appeler onWin avec le code généré
            if (onWin) {
              onWin({ 
                ...winner, 
                generatedCode: data.code || 'BOISSON_OFFERTE',
                validUntil: data.validUntil,
                prizeType: data.prizeType
              });
            }
          } else {
            console.error('❌ Erreur génération code:', data.error || 'Erreur inconnue');
            // Même si la génération échoue, on affiche le gain
            if (onWin) {
              onWin(winner);
            }
          }
        } catch (error) {
          console.error('❌ Erreur génération code promo:', error);
          if (onWin) {
            onWin(winner);
          }
        }
      } else if (winner.prize && onWin) {
        onWin(winner);
      }
    }, 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-900/90 via-blue-900/90 to-pink-900/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
      {/* Neige animée en arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className="absolute text-white/60 text-2xl animate-fall"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${3 + Math.random() * 4}s`,
              fontSize: `${10 + Math.random() * 15}px`
            }}
          >
            ❄️
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-br from-white via-yellow-50 to-orange-50 rounded-3xl max-w-md w-full p-6 relative overflow-hidden shadow-2xl border-4 border-yellow-300">
        {/* Effet de lumière pulsante */}
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-pink-400/20 animate-pulse pointer-events-none"></div>
        
        {/* Éléments festifs - Papa Noël et cadeaux */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
          {/* Papa Noël */}
          <div className="absolute -top-8 -left-8 text-6xl animate-bounce" style={{ animationDuration: '2s' }}>
            🎅
          </div>
          <div className="absolute -top-4 -right-4 text-5xl animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
            🎄
          </div>
          
          {/* Cadeaux animés */}
          <div className="absolute top-4 left-4 text-3xl animate-bounce" style={{ animationDuration: '1.5s' }}>🎁</div>
          <div className="absolute top-8 right-8 text-2xl animate-bounce" style={{ animationDuration: '1.8s', animationDelay: '0.3s' }}>🎁</div>
          <div className="absolute bottom-20 left-8 text-2xl animate-bounce" style={{ animationDuration: '2s', animationDelay: '0.6s' }}>🎁</div>
          <div className="absolute bottom-16 right-4 text-3xl animate-bounce" style={{ animationDuration: '1.7s', animationDelay: '0.9s' }}>🎁</div>
          
          {/* Confettis */}
          <div className="absolute top-12 left-12 text-xl animate-bounce delay-100">🎉</div>
          <div className="absolute top-16 right-16 text-lg animate-bounce delay-200">✨</div>
          <div className="absolute bottom-24 left-16 text-lg animate-bounce delay-300">⭐</div>
          <div className="absolute bottom-20 right-12 text-xl animate-bounce delay-400">💫</div>
        </div>
        
        {/* Bouton fermer */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors z-10"
        >
          <FaTimes />
        </button>
        
        {/* Titre avec effet lumineux */}
        <div className="text-center mb-6 relative z-10">
          <h2 className="text-3xl font-black mb-2 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
            🎰 Roue de la Chance 🎰
          </h2>
          <p className="text-gray-700 font-semibold text-sm bg-white/80 px-4 py-1 rounded-full inline-block">
            Tentez votre chance et gagnez des récompenses magiques ! ✨
          </p>
        </div>
        
        {/* Roue avec effets lumineux */}
        <div className="relative w-72 h-72 mx-auto mb-6">
          {/* Halo de lumière autour de la roue */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400/50 via-orange-400/50 to-pink-400/50 blur-2xl animate-pulse -z-10"></div>
          
          {/* Flèche indicateur améliorée */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 z-20">
            <div className="relative">
              <div className="w-0 h-0 border-l-[20px] border-l-transparent border-r-[20px] border-r-transparent border-t-[35px] border-t-red-600 drop-shadow-2xl filter drop-shadow-lg" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[28px] border-t-yellow-400" />
            </div>
            {/* Lueur autour de la flèche */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-0 h-0 border-l-[22px] border-l-transparent border-r-[22px] border-r-transparent border-t-[38px] border-t-yellow-300/50 blur-sm"></div>
          </div>
          
          {/* Roue SVG avec effets */}
          <div className="relative">
            {/* Ombre portée lumineuse */}
            <div className="absolute inset-0 rounded-full bg-yellow-400/30 blur-xl"></div>
            
            <svg
              ref={wheelRef}
              viewBox="0 0 200 200"
              className="w-full h-full drop-shadow-2xl relative z-10"
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4s cubic-bezier(0.17, 0.67, 0.12, 0.99)' : 'none',
                filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.6))'
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
              
              // Définir les gradients pour chaque segment
              const gradients = {
                "#f97316": ["#f97316", "#fb923c", "#fdba74"], // Orange
                "#3b82f6": ["#3b82f6", "#60a5fa", "#93c5fd"], // Bleu
                "#fbbf24": ["#fbbf24", "#fcd34d", "#fde68a"], // Jaune
                "#8b5cf6": ["#8b5cf6", "#a78bfa", "#c4b5fd"], // Violet
              };
              
              const gradientColors = gradients[segment.color] || [segment.color, segment.color, segment.color];
              const gradientId = `gradient-${index}`;
              
              return (
                <g key={index}>
                  {/* Définition du gradient */}
                  <defs>
                    <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={gradientColors[0]} stopOpacity="1" />
                      <stop offset="50%" stopColor={gradientColors[1]} stopOpacity="1" />
                      <stop offset="100%" stopColor={gradientColors[2]} stopOpacity="1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Segment avec gradient et ombre */}
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 95 95 0 ${largeArc} 1 ${x2} ${y2} Z`}
                    fill={`url(#${gradientId})`}
                    stroke="white"
                    strokeWidth="3"
                    className="brightness-110"
                    style={{
                      filter: 'drop-shadow(2px 2px 4px rgba(0,0,0,0.3))'
                    }}
                  />
                  
                  {/* Texte avec effet lumineux */}
                  <text
                    x={textX}
                    y={textY}
                    fill="white"
                    fontSize={segment.label.length > 10 ? "7" : "9"}
                    fontWeight="900"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                    style={{
                      textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.5)',
                      stroke: 'rgba(0,0,0,0.3)',
                      strokeWidth: '0.5px'
                    }}
                  >
                    {segment.label}
                  </text>
                </g>
              );
            })}
            {/* Centre de la roue amélioré */}
            <defs>
              <radialGradient id="centerGradient">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="1" />
                <stop offset="50%" stopColor="#f97316" stopOpacity="1" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="100" r="25" fill="url(#centerGradient)" stroke="white" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 10px rgba(251, 191, 36, 0.8))' }} />
            <circle cx="100" cy="100" r="18" fill="#fbbf24" style={{ filter: 'drop-shadow(0 0 5px rgba(255, 255, 255, 0.8))' }} />
            <text x="100" y="100" fill="white" fontSize="14" fontWeight="900" textAnchor="middle" dominantBaseline="middle" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>
              🎁
            </text>
          </svg>
          </div>
        </div>
        
        {/* Résultat amélioré */}
        {result && (
          <div className={`text-center mb-4 p-5 rounded-2xl relative overflow-hidden ${
            result.prize 
              ? 'bg-gradient-to-br from-green-100 via-yellow-50 to-orange-100 border-4 border-green-400 shadow-xl' 
              : 'bg-gray-50 border-2 border-gray-200'
          }`}>
            {result.prize && (
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 via-transparent to-pink-400/20 animate-pulse pointer-events-none"></div>
            )}
            {result.prize ? (
              <>
                <div className="text-5xl mb-3 animate-bounce">🎉</div>
                <p className="font-black text-2xl bg-gradient-to-r from-green-600 via-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2 drop-shadow-lg">
                  Félicitations !
                </p>
                <p className="text-green-700 font-bold text-lg mb-2">
                  Vous avez gagné : <strong className="text-green-800 text-xl">{result.label}</strong>
                </p>
                {generatedCode ? (
                  generatedCode === 'BOISSON_OFFERTE' ? (
                    <>
                      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 my-3">
                        <p className="text-lg font-bold text-blue-800 mb-2">🥤 Boisson offerte !</p>
                        <p className="text-sm text-blue-700">
                          Une boisson vous sera automatiquement ajoutée à votre prochaine commande.
                        </p>
                        <p className="text-xs text-blue-600 mt-2">
                          Valable 1 semaine • Aucun code nécessaire
                        </p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Consultez "Mes gains" dans votre profil pour voir votre gain actif !
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-green-600 mt-3 font-semibold">Votre code promo :</p>
                      <p className="text-lg font-mono bg-green-100 px-4 py-2 rounded-lg border-2 border-green-300 my-2 tracking-wider">
                        {generatedCode}
                      </p>
                      <p className="text-xs text-green-600 mt-2">
                        {result.prize?.type === 'free_delivery' 
                          ? 'Valable avant le 24 décembre • 1 seule utilisation'
                          : 'Valable 1 semaine • 1 seule utilisation'
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Utilisez ce code lors de votre prochaine commande !
                      </p>
                      <p className="text-xs text-gray-400 mt-2">
                        Consultez "Mes gains" dans votre profil pour voir tous vos codes actifs.
                      </p>
                    </>
                  )
                ) : (
                  <p className="text-sm text-green-600 mt-2">
                    Génération du code en cours...
                  </p>
                )}
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
        
        {/* Bouton tourner amélioré */}
        {alreadyPlayed && !result ? (
          <div className="text-center p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl border-2 border-gray-300">
            <p className="text-gray-700 font-bold">😅 Vous avez déjà joué pour cette commande !</p>
            <p className="text-gray-500 text-sm mt-1">Revenez après votre prochaine commande 🎁</p>
          </div>
        ) : (
          <button
            onClick={handleSpin}
            disabled={isSpinning || (alreadyPlayed && !result)}
            className={`w-full py-5 rounded-2xl font-black text-xl transition-all relative overflow-hidden ${
              isSpinning || alreadyPlayed
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 text-white hover:from-yellow-300 hover:via-orange-400 hover:to-red-400 transform hover:scale-[1.03] active:scale-[0.97] shadow-2xl hover:shadow-yellow-500/50 border-4 border-yellow-300'
            }`}
          >
            {isSpinning ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">🎰</span>
                <span>La roue tourne...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2 drop-shadow-lg">
                <span className="text-2xl">🎰</span>
                <span>Tourner la roue !</span>
                <span className="text-2xl">✨</span>
              </span>
            )}
            {/* Effet de brillance sur le bouton */}
            {!isSpinning && !alreadyPlayed && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-shimmer"></div>
            )}
          </button>
        )}
        
        {/* Disclaimer */}
        <p className="text-center text-xs text-gray-600 font-semibold mt-4 bg-white/60 px-3 py-2 rounded-full">
          1 chance par commande • Les lots sont valables 7 jours ✨
        </p>
      </div>

      {/* Styles CSS pour les animations */}
      <style jsx>{`
        @keyframes fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
        .animate-fall {
          animation: fall linear infinite;
        }
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}

