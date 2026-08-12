'use client';

import { useEffect } from 'react';

export default function RestaurantsRedirect() {
  useEffect(() => {
    // Hard redirect: évite de rester bloqué sur cet écran dans la WebView Sunmi
    try {
      window.location.replace('/');
    } catch (_) {
      window.location.href = '/';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirection vers l&apos;accueil...</p>
        <button
          type="button"
          className="mt-6 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold"
          onClick={() => {
            window.location.href = '/';
          }}
        >
          Aller à l&apos;accueil
        </button>
      </div>
    </div>
  );
}
