'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import Head from 'next/head';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔐 handleLogin appelé', { email: email ? 'présent' : 'vide', password: password ? 'présent' : 'vide' });
    
    if (!email || !password) {
      setError('Veuillez remplir tous les champs');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      console.log('🔐 Tentative de connexion pour:', email);
      console.log('🔐 Supabase client disponible:', !!supabase);
      console.log('🔐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Défini' : 'MANQUANT');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });
      
      console.log('🔐 Réponse Supabase:', { hasData: !!data, hasError: !!error, error: error?.message });

      if (error) {
        console.error('❌ Erreur de connexion:', error);
        // Traduire les messages d'erreur en français
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
          // L'email est maintenant confirmé automatiquement, donc cette erreur ne devrait plus arriver
          // Mais si elle arrive, on affiche un message générique
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard';
        } else if (error.message.includes('User not found')) {
          errorMessage = 'Aucun compte trouvé avec cet email';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError') || error.message.includes('load failed')) {
          errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
        }
        setError(errorMessage);
        setLoading(false);
        return;
      }

      if (data?.user) {
        console.log('✅ Connexion réussie, utilisateur:', data.user.id);
        
        // Rediriger selon le rôle
        try {
          // IMPORTANT:
          // Ne pas dépendre d'un SELECT direct sur public.users (RLS / profil manquant).
          // On passe par l'API serveur qui garantit l'existence du profil et renvoie le rôle.
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData?.session?.access_token;

          if (!accessToken) {
            router.push('/');
            return;
          }

          const meResponse = await fetch('/api/users/me', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });

          const meData = await meResponse.json().catch(() => ({}));
          let role = meResponse.ok ? meData?.role : null;

          // Fallback: certains déploiements de l'API /users/me ne renvoient pas encore "role"
          // ou la table users n'existe pas côté serveur. Dans ce cas, essayer de récupérer le rôle autrement.
          if (!role) {
            try {
              // 1) Via la table users (RLS: l'utilisateur doit pouvoir lire son propre profil)
              const { data: roleRow, error: roleError } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .maybeSingle();

              if (!roleError && roleRow?.role) {
                role = roleRow.role;
              }
            } catch (e) {
              // ignore
            }
          }

          // 2) Via metadata Supabase Auth (dernier recours)
          if (!role) {
            role = data.user?.user_metadata?.role || data.user?.app_metadata?.role || null;
          }

          // 3) Fallback mobile: déduire le rôle via tables publiques accessibles (ex: restaurants)
          // - Les partenaires ont souvent un enregistrement dans restaurants (accessible dans l'app)
          if (!role) {
            try {
              const { data: restaurantRow, error: restaurantErr } = await supabase
                .from('restaurants')
                .select('id')
                .eq('user_id', data.user.id)
                .maybeSingle();
              if (!restaurantErr && restaurantRow) {
                role = 'restaurant';
              }
            } catch (e) {
              // ignore
            }
          }

          // Fallback supplémentaire: certains comptes partenaires sont liés au restaurant via l'email (pas/plus via user_id)
          if (!role && data.user?.email) {
            try {
              const { data: restaurantByEmail, error: restaurantEmailErr } = await supabase
                .from('restaurants')
                .select('id')
                .eq('email', data.user.email)
                .maybeSingle();
              if (!restaurantEmailErr && restaurantByEmail) {
                role = 'restaurant';
              }
            } catch (e) {
              // ignore
            }
          }

          // - Les livreurs peuvent avoir une ligne delivery_stats (selon RLS, peut échouer, c'est ok)
          if (!role) {
            try {
              const { data: statsRow, error: statsErr } = await supabase
                .from('delivery_stats')
                .select('delivery_id')
                .eq('delivery_id', data.user.id)
                .maybeSingle();
              if (!statsErr && statsRow) {
                role = 'delivery';
              }
            } catch (e) {
              // ignore
            }
          }

          // Normaliser le rôle (évite les variations: "Partner", "partner ", etc.)
          if (typeof role === 'string') {
            role = role.trim().toLowerCase();
          }
          // Alias possibles
          if (role === 'restaurateur' || role === 'restauranteur') role = 'restaurant';

          console.log('✅ Rôle utilisateur détecté:', role);

          // Vérifier s'il y a une intention de redirection (ex: checkout)
          const redirectAfterLogin = typeof window !== 'undefined' ? localStorage.getItem('redirectAfterLogin') : null;
          if (redirectAfterLogin) {
            localStorage.removeItem('redirectAfterLogin');
            console.log('🔄 Redirection vers:', redirectAfterLogin);
            router.push(redirectAfterLogin);
            return;
          }

          if (role === 'admin') {
            router.push('/admin');
          } else if (role === 'delivery') {
            router.push('/delivery');
          } else if (role === 'restaurant' || role === 'partner') {
            router.push('/partner');
          } else {
            // Pour les clients, rediriger vers la page d'accueil
            router.push('/');
          }
        } catch (userError) {
          console.error('❌ Erreur récupération utilisateur:', userError);
          // Rediriger vers la page d'accueil en cas d'erreur
          router.push('/');
        }
      } else {
        setError('Erreur: Aucune donnée utilisateur reçue');
        setLoading(false);
      }
    } catch (error) {
      console.error('❌ Erreur inattendue lors de la connexion:', error);
      let errorMessage = 'Erreur de connexion';
      
      if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('load failed')) {
        errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
      } else if (error.message) {
        errorMessage = `Erreur: ${error.message}`;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
          Connexion
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Connectez-vous à votre compte
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Adresse email
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Mot de passe
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md placeholder-gray-400 dark:placeholder-gray-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Votre mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <FaEyeSlash className="h-5 w-5" />
                  ) : (
                    <FaEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !email || !password}
                onClick={(e) => {
                  console.log('🔐 Bouton cliqué', { loading, email: !!email, password: !!password });
                  // Ne pas empêcher la soumission du formulaire, juste logger
                  // La validation se fait dans handleLogin
                }}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Vous n'avez pas de compte ?{' '}
              <Link href="/register" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                Créer un compte
              </Link>
            </p>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
