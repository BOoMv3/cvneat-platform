'use client';

import { useEffect, useState } from 'react';

// Importer directement le composant RestaurantDetail
// On va créer une copie du composant ici pour éviter les problèmes d'import avec [id]
import RestaurantDetailContent from './RestaurantDetailContent';

export default function RestaurantDetailLoader() {
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const match = path.match(/\/restaurants\/([^\/\?]+)/);
      
      if (match && match[1]) {
        const id = match[1];
        console.log('[RestaurantDetailLoader] ✅ ID restaurant trouvé:', id);
        setRestaurantId(id);
        setLoading(false);
      } else {
        console.error('[RestaurantDetailLoader] ❌ Aucun ID restaurant trouvé dans l\'URL:', path);
        setLoading(false);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du restaurant...</p>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-red-600 mb-4">Erreur : Restaurant introuvable</p>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            }}
            className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  console.log('[RestaurantDetailLoader] ✅ Rendu du composant RestaurantDetailContent avec ID:', restaurantId);
  return <RestaurantDetailContent restaurantId={restaurantId} />;
}
