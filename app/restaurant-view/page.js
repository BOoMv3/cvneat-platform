'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import RestaurantDetailContent from '../components/RestaurantDetailContent';

function readRestaurantIdFromLocation() {
  try {
    if (typeof window === 'undefined') return '';
    const sp = new URLSearchParams(window.location.search || '');
    return (sp.get('id') || sp.get('restaurantId') || '').trim();
  } catch {
    return '';
  }
}

/**
 * Fiche restaurant via query: /restaurant-view?id=...
 * Évite useSearchParams + dynamic import (cassés sur vieux WebView Sunmi Android 7).
 */
export default function RestaurantViewPage() {
  const [restaurantId, setRestaurantId] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRestaurantId(readRestaurantIdFromLocation());
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4" />
          <p className="text-gray-600">Chargement du restaurant...</p>
          {/* Lien HTML brut si le JS ne démarre jamais */}
          <noscript>
            <p className="mt-4 text-sm text-red-600">Activez JavaScript ou ouvrez le lien complet avec ?id=</p>
          </noscript>
          <a href="/" className="inline-block mt-6 px-4 py-2 bg-orange-600 text-white rounded">
            Retour à l&apos;accueil
          </a>
        </div>
      </div>
    );
  }

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <p className="text-red-600 font-bold mb-2">Restaurant introuvable</p>
          <p className="text-sm text-gray-600 mb-4">
            Paramètre manquant: <code>id</code>
          </p>
          <Link href="/" className="inline-block px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  return <RestaurantDetailContent restaurantId={restaurantId} />;
}
