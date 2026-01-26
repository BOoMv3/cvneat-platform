'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { safeLocalStorage } from '../../lib/localStorage';

export default function CookieBanner() {
  const [consent, setConsent] = useState(null);
  const [preferences, setPreferences] = useState({ necessary: true });

  useEffect(() => {
    const savedConsent = safeLocalStorage.getJSON('cookieConsent');
    if (savedConsent) {
      setConsent(true);
      setPreferences(savedConsent);
    } else {
      setConsent(false);
    }
  }, []);

  const handleAccept = async () => {
    const essentialOnly = { necessary: true };
    safeLocalStorage.setJSON('cookieConsent', essentialOnly);
    setPreferences(essentialOnly);
    setConsent(true);
  };

  if (consent === null || consent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nous utilisons des cookies
            </h3>
            <p className="text-gray-600 text-sm mb-4">
              Nous utilisons uniquement des cookies essentiels (et stockage local) nécessaires au fonctionnement du service
              (connexion, panier, sécurité). Nous n’utilisons pas de cookies de tracking publicitaire.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleAccept}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          En continuant à naviguer sur ce site, vous acceptez notre{' '}
          <Link href="/politique-confidentialite" className="text-orange-500 hover:underline">
            politique de confidentialité
          </Link>
          .
        </div>
      </div>
    </div>
  );
} 