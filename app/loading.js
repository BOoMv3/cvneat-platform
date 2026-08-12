'use client';

import { useEffect, useState } from 'react';

export default function Loading() {
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    // Sur Sunmi/WebView, Next peut rester bloqué sur loading.js : proposer une sortie.
    const t = setTimeout(() => setStuck(true), 8000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="flex flex-col items-center text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
        <p className="text-gray-600">Chargement...</p>
        {stuck && (
          <button
            type="button"
            className="mt-6 px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-semibold"
            onClick={() => {
              try {
                window.location.replace('/');
              } catch (_) {
                window.location.href = '/';
              }
            }}
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
} 