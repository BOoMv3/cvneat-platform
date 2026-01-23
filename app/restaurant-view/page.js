'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// Page statique (compatible export) pour afficher un restaurant via query param:
// /restaurant-view?id=<restaurantId>
//
// Objectif: éviter la route dynamique /restaurants/[id] dans l'app iOS/Capacitor
// (qui peut provoquer des refresh en boucle en export statique).
const RestaurantDetailClient = dynamic(() => import('../components/RestaurantDetailContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Chargement du restaurant...</p>
      </div>
    </div>
  ),
});

export default function RestaurantViewPage() {
  const sp = useSearchParams();

  const restaurantId = useMemo(() => {
    const id = sp?.get('id') || sp?.get('restaurantId') || '';
    return id.trim();
  }, [sp]);

  if (!restaurantId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 max-w-md">
          <p className="text-red-600 font-bold mb-2">Restaurant introuvable</p>
          <p className="text-sm text-gray-600 mb-4">Paramètre manquant: <code>id</code></p>
          <Link href="/" className="inline-block px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">
            Retour à l’accueil
          </Link>
        </div>
      </div>
    );
  }

  return <RestaurantDetailClient restaurantId={restaurantId} />;
}


