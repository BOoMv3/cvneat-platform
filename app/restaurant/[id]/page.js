'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaShoppingCart, FaSpinner } from 'react-icons/fa';

// Composant pour la section du menu
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
    return <div className="text-center p-8"><FaSpinner className="animate-spin text-orange-500 mx-auto text-3xl" /></div>;
  }

  if (error) {
    return <p className="text-red-500 text-center">{error}</p>;
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
    <div className="space-y-8">
      {Object.entries(groupedMenu).map(([category, items]) => (
        <div key={category}>
          <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b-2 border-orange-500 pb-2">{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">{item.nom}</h3>
                  <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                  <p className="font-bold text-orange-600 mt-2">{item.prix.toFixed(2)}€</p>
                </div>
                <button 
                  onClick={() => handleAddToCart(item)}
                  className="bg-black text-white rounded-full p-3 hover:bg-gray-800 transition-colors"
                  aria-label={`Ajouter ${item.nom} au panier`}
                >
                  <FaShoppingCart />
                </button>
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
    console.log('Page chargée avec les paramètres:', params);
    
    const fetchRestaurant = async () => {
      try {
        console.log('ID du restaurant:', params.id);
        const response = await fetch(`/api/restaurants/${params.id}`);
        console.log('Statut de la réponse:', response.status);
        const data = await response.json();
        console.log('Données reçues:', data);
        
        if (!response.ok) {
          console.error('Erreur détaillée:', data);
          throw new Error(data.message || 'Erreur lors du chargement du restaurant');
        }
        
        setRestaurant(data);
      } catch (error) {
        console.error('Erreur complète:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRestaurant();
    } else {
      console.error('Pas d\'ID de restaurant fourni');
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
      <div className="relative h-[350px]">
        <Image
          src={restaurant.image_url || '/default-restaurant.jpg'}
          alt={restaurant.nom}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-4">
          <h1 className="text-4xl md:text-6xl font-bold mb-2">{restaurant.nom}</h1>
          <p className="text-lg md:text-xl max-w-2xl">{restaurant.description}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Colonne du menu */}
        <div className="lg:col-span-2">
           <MenuSection restaurantId={params.id} />
        </div>

        {/* Colonne des informations */}
        <aside className="lg:col-span-1">
          <div className="sticky top-24 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-4 border-b pb-2">Informations</h2>
            <div className="space-y-4">
              <InfoRow label="Adresse" value={restaurant.adresse} />
              <InfoRow label="Téléphone" value={restaurant.telephone} />
              <InfoRow label="Temps de livraison" value={`${restaurant.temps_livraison || '30'} min`} />
              <InfoRow label="Frais de livraison" value={`${restaurant.frais_livraison || '2.50'}€`} />
              <InfoRow label="Commande minimum" value={`${restaurant.commande_min || '15.00'}€`} />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const InfoRow = ({ label, value }) => (
  <div>
    <h3 className="font-semibold text-gray-800">{label}</h3>
    <p className="text-gray-600">{value}</p>
  </div>
); 