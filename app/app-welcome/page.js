'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaUtensils, FaMapMarkerAlt, FaClock, FaHeart } from 'react-icons/fa';

export default function AppWelcome() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Déjà connecté, rediriger vers l'accueil
        router.replace('/');
        return;
      }
      setChecking(false);
      // Animation d'entrée
      setTimeout(() => setShowContent(true), 100);
    };
    
    checkAuth();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center">
        <div className="animate-pulse">
          <div className="text-6xl font-black text-white tracking-tight">
            CVN<span className="text-yellow-300">'</span>EAT
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 overflow-hidden relative">
      {/* Cercles décoratifs animés */}
      <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-white/5 animate-pulse" />
      <div className="absolute bottom-[-30%] left-[-20%] w-[80vw] h-[80vw] rounded-full bg-white/5" />
      <div className="absolute top-[40%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-yellow-400/10" />
      
      {/* Contenu principal */}
      <div className={`relative z-10 min-h-screen flex flex-col items-center justify-between px-6 py-12 transition-all duration-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        
        {/* Logo et titre */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          {/* Logo animé */}
          <div className={`mb-6 transition-all duration-1000 delay-200 ${showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
            <div className="w-28 h-28 bg-white rounded-3xl shadow-2xl flex items-center justify-center transform rotate-3 hover:rotate-0 transition-transform">
              <span className="text-4xl font-black text-orange-500">
                CVN<span className="text-orange-600">'</span>
              </span>
            </div>
          </div>
          
          {/* Titre principal */}
          <h1 className={`text-5xl font-black text-white mb-3 tracking-tight transition-all duration-700 delay-300 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            CVN<span className="text-yellow-300">'</span>EAT
          </h1>
          
          {/* Slogan */}
          <p className={`text-xl text-white/90 font-medium mb-2 transition-all duration-700 delay-400 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Livraison locale en Cévennes
          </p>
          
          <p className={`text-lg text-yellow-200 font-semibold italic transition-all duration-700 delay-500 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            Par nous, pour vous
          </p>
          
          {/* Features */}
          <div className={`mt-10 grid grid-cols-2 gap-4 max-w-xs transition-all duration-700 delay-600 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            <div className="flex flex-col items-center p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <FaMapMarkerAlt className="text-yellow-300 text-2xl mb-2" />
              <span className="text-white/90 text-sm font-medium">100% Local</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <FaClock className="text-yellow-300 text-2xl mb-2" />
              <span className="text-white/90 text-sm font-medium">Livraison rapide</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <FaUtensils className="text-yellow-300 text-2xl mb-2" />
              <span className="text-white/90 text-sm font-medium">Restaurants locaux</span>
            </div>
            <div className="flex flex-col items-center p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
              <FaHeart className="text-yellow-300 text-2xl mb-2" />
              <span className="text-white/90 text-sm font-medium">Fait avec ❤️</span>
            </div>
          </div>
        </div>
        
        {/* Boutons d'action */}
        <div className={`w-full max-w-sm space-y-4 transition-all duration-700 delay-700 ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          {/* Bouton Connexion */}
          <button
            onClick={() => router.push('/login?redirect=/')}
            className="w-full py-4 bg-white text-orange-600 font-bold text-lg rounded-2xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Se connecter
          </button>
          
          {/* Bouton Inscription */}
          <button
            onClick={() => router.push('/inscription?redirect=/')}
            className="w-full py-4 bg-transparent border-2 border-white text-white font-bold text-lg rounded-2xl hover:bg-white/10 transform hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Créer un compte
          </button>
        </div>
        
        {/* Footer */}
        <div className={`mt-8 text-center transition-all duration-700 delay-800 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <p className="text-white/50 text-xs">
            © 2025 CVN'EAT - Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}

