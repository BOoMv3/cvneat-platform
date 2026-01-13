// Wrapper pour le composant RestaurantDetail dans l'app mobile
// Ce fichier charge DIRECTEMENT le composant sans passer par Next.js router
'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Charger le composant client dynamiquement
const RestaurantDetailClient = dynamic(() => import('./page-client'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du restaurant...</p>
      </div>
    </div>
  )
});

export default function RestaurantDetailWrapper() {
  const [restaurantId, setRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Extraire l'ID depuis l'URL : /restaurants/[id]
    const extractIdFromUrl = () => {
      if (typeof window === 'undefined') return null;
      
      console.log('[RestaurantDetailWrapper] 🔍 Extraction ID depuis URL:', {
        href: window.location.href,
        pathname: window.location.pathname,
        hash: window.location.hash
      });
      
      // Méthode 1 : Depuis window.location.pathname
      const pathMatch = window.location.pathname.match(/\/restaurants\/([^\/\?]+)/);
      if (pathMatch && pathMatch[1]) {
        console.log('[RestaurantDetailWrapper] ✅ ID trouvé via pathname:', pathMatch[1]);
        return pathMatch[1];
      }
      
      // Méthode 2 : Depuis window.location.href
      const hrefMatch = window.location.href.match(/\/restaurants\/([^\/\?]+)/);
      if (hrefMatch && hrefMatch[1]) {
        console.log('[RestaurantDetailWrapper] ✅ ID trouvé via href:', hrefMatch[1]);
        return hrefMatch[1];
      }
      
      // Méthode 3 : Depuis le hash
      if (window.location.hash) {
        const hashMatch = window.location.hash.match(/\/restaurants\/([^\/\?]+)/);
        if (hashMatch && hashMatch[1]) {
          console.log('[RestaurantDetailWrapper] ✅ ID trouvé via hash:', hashMatch[1]);
          return hashMatch[1];
        }
      }
      
      console.error('[RestaurantDetailWrapper] ❌ Aucun ID trouvé dans l\'URL');
      return null;
    };

    // Essayer immédiatement
    let id = extractIdFromUrl();
    
    if (id) {
      setRestaurantId(id);
      setLoading(false);
    } else {
      // Si pas d'ID, attendre un peu et réessayer (pour Capacitor)
      const timeout = setTimeout(() => {
        id = extractIdFromUrl();
        if (id) {
          setRestaurantId(id);
          setLoading(false);
        } else {
          console.error('[RestaurantDetailWrapper] ❌ Impossible de trouver l\'ID après timeout');
          setLoading(false);
        }
      }, 500);
      
      return () => clearTimeout(timeout);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du restaurant...</p>
          <p className="text-xs text-gray-400 mt-2">URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4 font-bold">Erreur : Restaurant introuvable</p>
          <p className="text-sm text-gray-500 mb-2">Impossible d'extraire l'ID du restaurant depuis l'URL.</p>
          <p className="text-xs text-gray-400 mb-4 break-all">URL actuelle: {typeof window !== 'undefined' ? window.location.href : 'N/A'}</p>
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

  console.log('[RestaurantDetailWrapper] ✅ Rendu du composant avec ID:', restaurantId);
  
  // Passer l'ID comme params au composant client
  return <RestaurantDetailClient params={{ id: restaurantId }} />;
}
