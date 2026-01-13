'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AppWelcome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isCapacitor, setIsCapacitor] = useState(false);

  useEffect(() => {
    // Vérifier si on est dans l'app Capacitor
    const checkCapacitor = () => {
      if (typeof window !== 'undefined') {
        const isCap = window.location.protocol === 'capacitor:' || 
                      window.location.href.indexOf('capacitor://') === 0 ||
                      window.Capacitor !== undefined;
        setIsCapacitor(isCap);
        return isCap;
      }
      return false;
    };

    const init = async () => {
      const isCap = checkCapacitor();
      
      if (isCap) {
        // Dans l'app mobile, vérifier l'authentification
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // Utilisateur connecté, rediriger selon le rôle
            const { data: userData } = await supabase
              .from('users')
              .select('role')
              .eq('id', session.user.id)
              .single();

            if (userData?.role === 'admin') {
              router.replace('/admin');
            } else if (userData?.role === 'delivery') {
              router.replace('/delivery');
            } else if (userData?.role === 'restaurant') {
              router.replace('/partner');
            } else {
              router.replace('/');
            }
          } else {
            // Pas connecté, rediriger vers login
            router.replace('/login');
          }
        } catch (error) {
          console.error('Erreur vérification auth:', error);
          router.replace('/login');
        }
      } else {
        // Sur le web, rediriger vers la page d'accueil
        router.replace('/');
      }
      
      setLoading(false);
    };

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg animate-pulse">
            <div className="w-20 h-20 bg-white rounded-xl flex items-center justify-center">
              <svg className="w-12 h-12 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent">
            CVN'EAT
          </h1>
          <p className="text-gray-500 mt-2">Chargement...</p>
        </div>
      </div>
    );
  }

  return null;
}
