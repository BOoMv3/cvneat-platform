'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { safeLocalStorage } from '../../lib/localStorage';
import { supabase } from '../../lib/supabase';

export default function CookieBanner() {
  const [consent, setConsent] = useState(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Vérifier si l'utilisateur est connecté
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();

    const savedConsent = safeLocalStorage.getJSON('cookieConsent');
    if (savedConsent) {
      setConsent(true);
      setPreferences(savedConsent);
    } else {
      setConsent(false);
    }
  }, []);

  const savePreferencesToSupabase = async (prefs) => {
    if (user) {
      const { error } = await supabase
        .from('user_preferences')
        .upsert({
          user_id: user.id,
          cookie_preferences: prefs,
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Erreur lors de la sauvegarde des préférences:', error);
      }
    }
  };

  const handleAcceptAll = async () => {
    const allPreferences = { necessary: true, analytics: true, marketing: true };
    safeLocalStorage.setJSON('cookieConsent', allPreferences);
    setConsent(true);
    await savePreferencesToSupabase(allPreferences);
  };

  const handleAcceptSelection = async () => {
    safeLocalStorage.setJSON('cookieConsent', preferences);
    setConsent(true);
    await savePreferencesToSupabase(preferences);
  };

  const handlePreferenceChange = (key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
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
              Nous utilisons des cookies pour améliorer votre expérience, analyser le trafic et personnaliser le contenu.
              Vous pouvez choisir les cookies que vous acceptez.
            </p>
            
            {showPreferences && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Cookies essentiels</h4>
                    <p className="text-sm text-gray-600">Nécessaires au fonctionnement du site</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.necessary}
                    disabled
                    className="h-4 w-4 text-orange-500 rounded border-gray-300"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Cookies analytiques</h4>
                    <p className="text-sm text-gray-600">Pour analyser l'utilisation du site</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => handlePreferenceChange('analytics')}
                    className="h-4 w-4 text-orange-500 rounded border-gray-300"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">Cookies marketing</h4>
                    <p className="text-sm text-gray-600">Pour personnaliser les publicités</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => handlePreferenceChange('marketing')}
                    className="h-4 w-4 text-orange-500 rounded border-gray-300"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              {showPreferences ? 'Masquer les détails' : 'Voir les détails'}
            </button>
            <button
              onClick={handleAcceptSelection}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
            >
              Enregistrer mes choix
            </button>
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
            >
              Tout accepter
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