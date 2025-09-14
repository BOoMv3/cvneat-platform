'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaHeart, FaStar, FaClock, FaMotorcycle, FaMapMarkerAlt, FaArrowLeft, FaHome } from 'react-icons/fa';
import FavoriteButton from '../components/FavoriteButton';
import OptimizedRestaurantImage from '@/components/OptimizedRestaurantImage';
import PageHeader from '@/components/PageHeader';

export default function FavoritesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
    
    if (user) {
      await fetchFavorites(user.id);
    } else {
      // Pour les utilisateurs non connectés, utiliser localStorage
      loadFavoritesFromLocalStorage();
    }
  };

  const fetchFavorites = async (userId) => {
    try {
      const response = await fetch(`/api/users/favorites?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setFavorites(data);
      } else {
        setError('Erreur lors du chargement des favoris');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des favoris:', error);
      setError('Erreur lors du chargement des favoris');
    } finally {
      setLoading(false);
    }
  };

  const loadFavoritesFromLocalStorage = () => {
    const favoriteIds = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    // Charger les détails des restaurants favoris
    Promise.all(
      favoriteIds.map(async (restaurantId) => {
        try {
          const response = await fetch(`/api/restaurants/${restaurantId}`);
          if (response.ok) {
            return await response.json();
          }
        } catch (error) {
          console.error(`Erreur lors du chargement du restaurant ${restaurantId}:`, error);
        }
        return null;
      })
    ).then(restaurants => {
      setFavorites(restaurants.filter(Boolean));
      setLoading(false);
    });
  };

  const handleRestaurantClick = (restaurant) => {
    router.push(`/restaurants/${restaurant.id}`);
  };

  const handleFavoriteToggle = (restaurantId) => {
    // Mettre à jour la liste locale
    setFavorites(prev => prev.filter(fav => fav.restaurant_id !== restaurantId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement de vos favoris...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Mes Favoris" 
        icon={FaHeart}
        className="max-w-7xl mx-auto"
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-gray-600">
              {favorites.length} restaurant{favorites.length !== 1 ? 's' : ''} favori{favorites.length !== 1 ? 's' : ''}
            </p>
          </div>
          
          {!user && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                <strong>Connexion recommandée :</strong> Connectez-vous pour synchroniser vos favoris sur tous vos appareils.
              </p>
              <button
                onClick={() => router.push('/login')}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Se connecter
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {favorites.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaHeart className="text-6xl text-gray-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun favori pour le moment</h3>
            <p className="text-gray-600 text-lg mb-8">
              Découvrez des restaurants et ajoutez-les à vos favoris !
            </p>
            <button
              onClick={() => router.push('/')}
              className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
            >
              Découvrir les restaurants
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const restaurant = favorite.restaurants || favorite;
              return (
                <div
                  key={restaurant.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => handleRestaurantClick(restaurant)}
                >
                  {/* Image du restaurant */}
                  <div className="relative h-48 bg-gray-200">
                    <OptimizedRestaurantImage
                      restaurant={restaurant}
                      className="h-full w-full"
                      priority={false}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    
                    {/* Bouton favori */}
                    <div className="absolute top-3 right-3">
                      <FavoriteButton
                        restaurantId={restaurant.id}
                        userId={user?.id}
                        onToggle={() => handleFavoriteToggle(restaurant.id)}
                        className="bg-white rounded-full p-2 shadow-md hover:shadow-lg"
                      />
                    </div>
                  </div>

                  {/* Informations du restaurant */}
                  <div className="p-4">
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {restaurant.nom}
                    </h3>
                    
                    {restaurant.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {restaurant.description}
                      </p>
                    )}

                    {/* Note et avis */}
                    <div className="flex items-center mb-3">
                      <div className="flex items-center">
                        <FaStar className="text-yellow-400 text-sm" />
                        <span className="ml-1 text-sm font-medium text-gray-700">
                          {restaurant.rating || 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Informations de livraison */}
                    <div className="flex items-center justify-between text-sm text-gray-600">
                      <div className="flex items-center">
                        <FaClock className="mr-1" />
                        <span>{restaurant.delivery_time || '30'} min</span>
                      </div>
                      <div className="flex items-center">
                        <FaMotorcycle className="mr-1" />
                        <span>{restaurant.frais_livraison || 'Gratuit'}€</span>
                      </div>
                      {restaurant.adresse && (
                        <div className="flex items-center">
                          <FaMapMarkerAlt className="mr-1" />
                          <span className="truncate max-w-20">{restaurant.ville}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
