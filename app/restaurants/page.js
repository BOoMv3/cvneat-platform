'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RestaurantsRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Rediriger vers la page d'accueil
    router.replace('/');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection vers l'accueil...</p>
      </div>
    </div>
  );
}
