'use client';

import { useState, useEffect } from 'react';
import { FaHeart } from 'react-icons/fa';

export default function FavoriteButton({ restaurantId, userId, className = '', onToggle }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userId) {
      checkFavoriteStatus();
    } else {
      // Pour les utilisateurs non connectés, utiliser localStorage
      const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
      setIsFavorite(favorites.includes(restaurantId));
    }
  }, [restaurantId, userId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await fetch(`/api/users/favorites?userId=${userId}`);
      if (response.ok) {
        const favorites = await response.json();
        const isRestaurantFavorite = favorites.some(fav => fav.restaurant_id === restaurantId);
        setIsFavorite(isRestaurantFavorite);
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des favoris:', error);
    }
  };

  const handleToggleFavorite = async () => {
    if (loading) return;
    
    setLoading(true);

    try {
      if (userId) {
        // Utilisateur connecté - utiliser l'API
        if (isFavorite) {
          // Supprimer des favoris
          await fetch(`/api/users/favorites?userId=${userId}&restaurantId=${restaurantId}`, {
            method: 'DELETE'
          });
        } else {
          // Ajouter aux favoris
          await fetch('/api/users/favorites', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, restaurantId })
          });
        }
      } else {
        // Utilisateur non connecté - utiliser localStorage
        const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        let newFavorites;
        
        if (isFavorite) {
          newFavorites = favorites.filter(id => id !== restaurantId);
        } else {
          newFavorites = [...favorites, restaurantId];
        }
        
        localStorage.setItem('favorites', JSON.stringify(newFavorites));
      }

      setIsFavorite(!isFavorite);
      
      // Callback pour notifier le parent
      if (onToggle) {
        onToggle(!isFavorite);
      }
    } catch (error) {
      console.error('Erreur lors de la gestion des favoris:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`favorite-button ${className} ${
        isFavorite ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
      } transition-colors duration-200 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <FaHeart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
}
