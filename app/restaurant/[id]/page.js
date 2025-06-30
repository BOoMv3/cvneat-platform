'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaShoppingCart, FaSpinner, FaArrowLeft } from 'react-icons/fa';

// Composant pour la section du menu simplifié
const MenuSection = ({ restaurantId }) => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
        if (!response.ok) {
          throw new Error('Le menu n\'est pas disponible pour le moment.');
        }
        const data = await response.json();
        setMenu(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId]);

  const handleAddToCart = (item) => {
    console.log("Ajout au panier:", item);
    // Logique d'ajout au panier à implémenter
  };

  if (loading) {
    return <div className="text-center p-4"><FaSpinner className="animate-spin text-orange-500 mx-auto text-2xl" /></div>;
  }

  if (error) {
    return <p className="text-red-500 text-center p-4">{error}</p>;
  }
  
  const groupedMenu = menu.reduce((acc, item) => {
    const category = item.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(groupedMenu).map(([category, items]) => (
        <div key={category} className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-bold mb-3 text-gray-800 border-b border-orange-200 pb-2">{category}</h2>
          <div className="space-y-3">
            {items.map(item => (
              <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{item.nom}</h3>
                  {item.description && (
                    <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center space-x-3 ml-4">
                  <span className="font-bold text-orange-600 text-sm">
                    {typeof item.prix === 'number' ? item.prix.toFixed(2) : 'Prix non disponible'}€
                  </span>
                  <button 
                    onClick={() => handleAddToCart(item)}
                    className="bg-orange-500 text-white rounded-full p-2 hover:bg-orange-600 transition-colors"
                    aria-label={`Ajouter ${item.nom} au panier`}
                  >
                    <FaShoppingCart className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RestaurantPage({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await fetch(`/api/restaurants/${params.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors du chargement du restaurant');
        }
        
        setRestaurant(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRestaurant();
    } else {
      setError('ID du restaurant manquant');
      setLoading(false);
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="mt-4 inline-block text-blue-600 hover:text-blue-800"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Restaurant non trouvé</h1>
          <button 
            onClick={() => router.push('/')}
            className="text-blue-600 hover:text-blue-800"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compact */}
      <div className="relative h-[200px]">
        <Image
          src={restaurant.image_url || '/default-restaurant.jpg'}
          alt={restaurant.nom}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        
        {/* Bouton retour */}
        <button
          onClick={() => router.push('/')}
          className="absolute top-4 left-4 bg-white bg-opacity-90 text-gray-800 p-2 rounded-full hover:bg-opacity-100 transition-all duration-200"
        >
          <FaArrowLeft className="h-4 w-4" />
        </button>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
          <h1 className="text-2xl md:text-3xl font-bold mb-1">{restaurant.nom}</h1>
          <p className="text-sm md:text-base max-w-2xl">{restaurant.description}</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Informations rapides */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div>
              <p className="font-semibold text-gray-800">Livraison</p>
              <p className="text-gray-600">{restaurant.temps_livraison || '30'} min</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Frais</p>
              <p className="text-gray-600">{restaurant.frais_livraison || '2.50'}€</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Minimum</p>
              <p className="text-gray-600">{restaurant.commande_min || '15.00'}€</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800">Téléphone</p>
              <p className="text-gray-600">{restaurant.telephone}</p>
            </div>
          </div>
        </div>

        {/* Menu */}
        <MenuSection restaurantId={params.id} />
      </div>
    </div>
  );
} 