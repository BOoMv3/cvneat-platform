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
    // Récompenses : coûts doublés (1 pt = 1€ sur les articles) pour ne pas donner les réduc trop vite
    const rewards = [
      {
        id: 'article-offert',
        name: 'Article offert',
        description: 'Un dessert ou une boisson au choix offert avec votre prochaine commande',
        cost: 100,
        icon: '🎁',
        available: true,
        featured: true
      },
      {
        id: 'reduction-5',
        name: 'Réduction 5€',
        description: '5€ de réduction sur votre prochaine commande',
        cost: 200,
        icon: '🎫',
        available: true,
        featured: false
      },
      {
        id: 'livraison-gratuite',
        name: 'Livraison gratuite',
        description: 'Livraison gratuite sur votre prochaine commande',
        cost: 160,
        icon: '🚚',
        available: true,
        featured: false
      },
      {
        id: 'reduction-10',
        name: 'Réduction 10€',
        description: '10€ de réduction sur votre prochaine commande',
        cost: 400,
        icon: '💳',
        available: true,
        featured: false
      }
    ];
    setRewards(rewards);
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
      <div className={`${currentLevelData.bgColor} dark:bg-gray-800 ${currentLevelData.borderColor} dark:border-gray-700 border rounded-lg p-6`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <CurrentLevelIcon className={`text-3xl ${currentLevelData.color} mr-3`} />
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Niveau {currentLevelData.name}</h3>
              <p className="text-gray-600 dark:text-gray-300">{userPoints} points</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{userPoints}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">points totaux</div>
          </div>
        </div>

        {nextLevel && (
          <div>
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-2">
              <span>Progression vers {LOYALTY_LEVELS[nextLevel].name}</span>
              <span>{userPoints} / {LOYALTY_LEVELS[nextLevel].minPoints} pts</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-500 ${currentLevelData.color.replace('text-', 'bg-')}`}
                style={{ width: `${progressToNext}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              Plus que {LOYALTY_LEVELS[nextLevel].minPoints - userPoints} points pour atteindre le niveau {LOYALTY_LEVELS[nextLevel].name} !
            </p>
          </div>
        )}

        {!nextLevel && (
          <div className="text-center py-4">
            <FaCrown className="text-4xl text-yellow-500 mx-auto mb-2" />
            <p className="text-lg font-semibold text-gray-900 dark:text-white">Niveau maximum atteint !</p>
            <p className="text-gray-600 dark:text-gray-300">Vous profitez de tous les avantages disponibles</p>
          </div>
        )}
      </div>

      {/* Avantages du niveau actuel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vos avantages</h4>
        <div className="space-y-3">
          {currentLevelData.benefits.map((benefit, index) => (
            <div key={index} className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Récompenses disponibles */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Récompenses disponibles</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Échangez vos points contre des récompenses à utiliser lors de votre prochaine commande.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {rewards.map((reward) => (
            <div 
              key={reward.id} 
              className={`border rounded-lg p-4 dark:border-gray-700 ${
                reward.featured 
                  ? 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 ring-2 ring-orange-200 dark:ring-orange-800' 
                  : reward.available 
                    ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20' 
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{reward.icon}</span>
                <span className={`text-sm font-medium ${reward.featured ? 'text-orange-600 dark:text-orange-400' : 'text-gray-600 dark:text-gray-300'}`}>
                  {reward.cost} pts {reward.featured && <span className="text-xs">(le plus populaire)</span>}
                </span>
              </div>
              <h5 className="font-semibold text-gray-900 dark:text-white mb-1">{reward.name}</h5>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">{reward.description}</p>
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

      {/* Comment gagner des points */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Comment gagner des points ?</h4>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700">
            <span className="text-gray-700 dark:text-gray-300">À chaque commande livrée</span>
            <span className="font-medium text-green-600 dark:text-green-400">+1 point par euro dépensé</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 pt-2">
            Exemple : une commande de 25€ (articles) = 25 points. Avec 100 points, offrez-vous un dessert ou une boisson !
          </p>
        </div>
      </div>
    </div>
  );
}
