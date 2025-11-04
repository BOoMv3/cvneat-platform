'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState('Vérification de votre compte...');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Récupérer le hash de l'URL (token de confirmation)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          // Échanger les tokens avec Supabase
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });

          if (error) {
            console.error('Erreur lors de la confirmation:', error);
            setStatus('Erreur lors de la confirmation. Veuillez réessayer.');
            setTimeout(() => {
              router.push('/login');
            }, 3000);
            return;
          }

          if (session) {
            setStatus('Compte confirmé avec succès ! Redirection...');
            // Rediriger vers la page d'accueil ou le profil
            setTimeout(() => {
              router.push('/');
            }, 2000);
          }
        } else {
          // Pas de tokens dans l'URL, vérifier si l'utilisateur est déjà connecté
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus('Vous êtes déjà connecté. Redirection...');
            setTimeout(() => {
              router.push('/');
            }, 2000);
          } else {
            setStatus('Lien de confirmation invalide.');
            setTimeout(() => {
              router.push('/login');
            }, 3000);
          }
        }
      } catch (error) {
        console.error('Erreur callback:', error);
        setStatus('Erreur lors de la confirmation. Veuillez réessayer.');
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-700 dark:text-gray-300">{status}</p>
      </div>
    </div>
  );
}

