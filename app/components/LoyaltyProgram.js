'use client';

import { useState, useEffect } from 'react';
import { FaGift, FaTrophy, FaStar, FaCrown, FaGem } from 'react-icons/fa';

const LOYALTY_LEVELS = {
  bronze: {
    name: 'Bronze',
    icon: FaGift,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    minPoints: 0,
    benefits: ['Accès aux offres spéciales', 'Notifications en avant-première']
  },
  silver: {
    name: 'Argent',
    icon: FaStar,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    minPoints: 500,
    benefits: ['Livraison gratuite dès 30€', 'Réduction 5% sur les commandes', 'Accès aux offres exclusives']
  },
  gold: {
    name: 'Or',
    icon: FaTrophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    minPoints: 1500,
    benefits: ['Livraison gratuite dès 20€', 'Réduction 10% sur les commandes', 'Accès prioritaire au support']
  },
  platinum: {
    name: 'Platine',
    icon: FaCrown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    minPoints: 3000,
    benefits: ['Livraison gratuite illimitée', 'Réduction 15% sur les commandes', 'Invitations VIP aux événements']
  },
  diamond: {
    name: 'Diamant',
    icon: FaGem,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    minPoints: 5000,
    benefits: ['Tous les avantages précédents', 'Conseiller personnel', 'Expériences culinaires exclusives']
  }
};

export default function LoyaltyProgram({ userPoints = 0, className = '' }) {
  const [currentLevel, setCurrentLevel] = useState('bronze');
  const [nextLevel, setNextLevel] = useState('silver');
  const [progressToNext, setProgressToNext] = useState(0);
  const [rewards, setRewards] = useState([]);

  useEffect(() => {
    calculateLevel();
    fetchRewards();
  }, [userPoints]);

  const calculateLevel = () => {
    const levels = Object.keys(LOYALTY_LEVELS);
    
    for (let i = levels.length - 1; i >= 0; i--) {
      const level = levels[i];
      if (userPoints >= LOYALTY_LEVELS[level].minPoints) {
        setCurrentLevel(level);
        
        // Trouver le prochain niveau
        const nextLevelIndex = i + 1;
        if (nextLevelIndex < levels.length) {
          setNextLevel(levels[nextLevelIndex]);
          const currentLevelPoints = LOYALTY_LEVELS[level].minPoints;
          const nextLevelPoints = LOYALTY_LEVELS[levels[nextLevelIndex]].minPoints;
          const progress = ((userPoints - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) * 100;
          setProgressToNext(Math.min(progress, 100));
        } else {
          setNextLevel(null);
          setProgressToNext(100);
        }
        break;
      }
    }
  };

  const fetchRewards = async () => {
    // Simulation des récompenses disponibles
    const mockRewards = [
      {
        id: 1,
        name: 'Réduction 5€',
        description: 'Bon de réduction de 5€ sur votre prochaine commande',
        cost: 200,
        icon: '🎫',
        available: true
      },
      {
        id: 2,
        name: 'Livraison gratuite',
        description: 'Livraison gratuite sur votre prochaine commande',
        cost: 150,
        icon: '🚚',
        available: true
      },
      {
        id: 3,
        name: 'Dessert offert',
        description: 'Un dessert au choix offert avec votre commande',
        cost: 100,
        icon: '🍰',
        available: true
      },
      {
        id: 4,
        name: 'Réduction 10€',
        description: 'Bon de réduction de 10€ sur votre prochaine commande',
        cost: 500,
        icon: '💳',
        available: userPoints >= 500
      }
    ];
    
    setRewards(mockRewards);
  };

  const redeemReward = async (rewardId) => {
    try {
      // Logique pour échanger une récompense
      console.log('Échange de la récompense:', rewardId);
      
      // Ici on appellerait l'API pour échanger la récompense
      // Pour l'instant, on simule le succès
      alert(`Récompense ${rewardId} échangée avec succès !`);
      
      // Recharger les récompenses
      fetchRewards();
    } catch (error) {
      console.error('Erreur lors de l\'échange de la récompense:', error);
      alert('Erreur lors de l\'échange de la récompense');
    }
  };

  const CurrentLevelIcon = LOYALTY_LEVELS[currentLevel].icon;
  const currentLevelData = LOYALTY_LEVELS[currentLevel];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Niveau actuel */}
      <div className={`${currentLevelData.bgColor} ${currentLevelData.borderColor} border rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CurrentLevelIcon className={`text-3xl ${currentLevelData.color} mr-3`} />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Niveau {currentLevelData.name}</h3>
              <p className="text-gray-600">{userPoints} points</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900">{userPoints}</div>
            <div className="text-sm text-gray-600">points totaux</div>
          </div>
        </div>

        {nextLevel && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Progression vers {LOYALTY_LEVELS[nextLevel].name}</span>
              <span>{userPoints} / {LOYALTY_LEVELS[nextLevel].minPoints} pts</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${currentLevelData.color.replace('text-', 'bg-')}`}
                style={{ width: `${progressToNext}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Plus que {LOYALTY_LEVELS[nextLevel].minPoints - userPoints} points pour atteindre le niveau {LOYALTY_LEVELS[nextLevel].name} !
            </p>
          </div>
        )}

        {!nextLevel && (
          <div className="text-center py-4">
            <FaCrown className="text-4xl text-yellow-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-gray-900">Niveau maximum atteint !</p>
            <p className="text-gray-600">Vous profitez de tous les avantages disponibles</p>
          </div>
        )}
      </div>

      {/* Avantages du niveau actuel */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Vos avantages</h4>
        <div className="space-y-3">
          {currentLevelData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Récompenses disponibles */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Récompenses disponibles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((reward) => (
            <div 
              key={reward.id} 
              className={`border rounded-lg p-4 ${reward.available ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{reward.icon}</span>
                <span className="text-sm font-medium text-gray-600">{reward.cost} pts</span>
              </div>
              <h5 className="font-semibold text-gray-900 mb-1">{reward.name}</h5>
              <p className="text-sm text-gray-600 mb-3">{reward.description}</p>
              <button
                onClick={() => redeemReward(reward.id)}
                disabled={!reward.available || userPoints < reward.cost}
                className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                  reward.available && userPoints >= reward.cost
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {!reward.available 
                  ? 'Verrouillé' 
                  : userPoints < reward.cost 
                    ? 'Points insuffisants' 
                    : 'Échanger'
                }
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Historique des points */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Comment gagner des points ?</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Commande terminée</span>
            <span className="font-medium text-green-600">+1 point par €</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Première commande</span>
            <span className="font-medium text-green-600">+50 points bonus</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Avis laissé</span>
            <span className="font-medium text-green-600">+20 points</span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="text-gray-700">Parrainage d\'un ami</span>
            <span className="font-medium text-green-600">+100 points</span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-gray-700">Commande d\'anniversaire</span>
            <span className="font-medium text-green-600">+200 points</span>
          </div>
        </div>
      </div>
    </div>
  );
}
