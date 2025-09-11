"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function RestaurantsList() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await fetch('/api/restaurants');
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || 'Erreur lors du chargement des restaurants');
        }
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          throw new Error('Réponse inattendue du serveur (pas du JSON)');
        }
        const data = await response.json();
        setRestaurants(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  // Tri sponsorisé en haut
  const now = new Date();
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    const aSponsor = a.mise_en_avant && a.mise_en_avant_fin && new Date(a.mise_en_avant_fin) > now;
    const bSponsor = b.mise_en_avant && b.mise_en_avant_fin && new Date(b.mise_en_avant_fin) > now;
    if (aSponsor === bSponsor) return 0;
    return aSponsor ? -1 : 1;
  });

  const handleCardClick = (id) => {
    try {
      router.push(`/restaurants/${id}`);
    } catch (e) {
      alert('Erreur de navigation. Veuillez réessayer.');
    }
  };

  if (loading) return <div className="p-8 text-center">Chargement...</div>;
  if (error) return <div className="p-8 text-center text-red-600">{error}<br/><button onClick={()=>window.location.reload()} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Recharger</button></div>;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Tous les restaurants</h1>
      {sortedRestaurants.length === 0 ? (
        <p className="text-gray-600 text-center py-8">Aucun restaurant disponible.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {sortedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => handleCardClick(restaurant.id)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer touch-manipulation active:scale-95"
            >
              <div className="relative h-40 sm:h-48">
                <Image
                  src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'}
                  alt={restaurant.nom}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > now && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-white px-2 sm:px-3 py-1 rounded-full text-xs font-bold shadow">Sponsorisé</span>
                )}
              </div>
              <div className="p-3 sm:p-4">
                <h3 className="text-xl font-semibold mb-2">{restaurant.nom}</h3>
                <p className="text-gray-600 mb-2">{restaurant.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-4">⭐ {restaurant.rating || '4.5'}</span>
                    <span>🕒 {restaurant.deliveryTime} min</span>
                  </div>
                  <div className="text-right">
                    <p>Frais de livraison à partir de {restaurant.frais_livraison || restaurant.deliveryFee || 2.50}€</p>
                    <p>Commande min: {restaurant.minOrder}€</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 