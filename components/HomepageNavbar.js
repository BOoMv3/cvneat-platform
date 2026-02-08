'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';
import { 
  FaSearch, 
  FaUser, 
  FaSignInAlt, 
  FaUserPlus, 
  FaGift,
  FaSignOutAlt,
  FaUtensils,
  FaShoppingCart,
  FaMapMarkerAlt,
  FaTruck
} from 'react-icons/fa';

export default function HomepageNavbar({ user, userPoints, cart, showFloatingCart, setShowFloatingCart }) {
  const router = useRouter();
  const [cartItemCount, setCartItemCount] = useState(0);
  const [userRole, setUserRole] = useState('');

  useEffect(() => {
    const loadCart = () => {
      try {
        const savedCart = safeLocalStorage.getJSON('cart');
        const items = Array.isArray(savedCart?.items) ? savedCart.items : [];
        const count = items.reduce((total, item) => total + (parseInt(item?.quantity ?? 1, 10) || 0), 0);
        setCartItemCount(count);
      } catch {
        setCartItemCount(0);
      }
    };
    loadCart();

    // IMPORTANT: l'event "storage" ne se déclenche pas dans le même onglet.
    // On écoute donc un event custom déclenché par safeLocalStorage lors des mises à jour du panier.
    const onCartUpdated = () => loadCart();
    const onFocus = () => loadCart();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') loadCart();
    };

    window.addEventListener('cvneat-cart-updated', onCartUpdated);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.removeEventListener('cvneat-cart-updated', onCartUpdated);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!user) {
          if (!cancelled) setUserRole('');
          return;
        }
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        if (!cancelled) setUserRole((userData?.role || '').toString().trim().toLowerCase());
      } catch {
        if (!cancelled) setUserRole('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <>
      {/* Logo CVN'EAT en haut à gauche avec glassmorphism */}
      <div className="absolute top-2 left-2 sm:top-4 sm:left-4 z-20 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-2xl px-3 py-2 shadow-lg border border-white/20 dark:border-gray-700/30">
        <Link href="/" className="flex items-center space-x-2 sm:space-x-3">
          <div className="relative">
            <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
              <div className="w-5 h-5 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center">
                <FaUtensils className="h-3 w-3 sm:h-5 sm:w-5 text-orange-600" />
              </div>
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 sm:w-5 sm:h-5 bg-green-500 rounded-full border-2 sm:border-3 border-white shadow-md animate-pulse"></div>
            <div className="absolute -bottom-1 -left-1 w-2 h-2 sm:w-3 sm:h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent tracking-tight">
              CVN'EAT
            </span>
            <span className="text-xs text-gray-500 -mt-1 font-medium hidden sm:block">Excellence culinaire</span>
          </div>
        </Link>
      </div>
      
      {/* Actions utilisateur en haut à droite - Design avec glassmorphism */}
      <div className="absolute top-2 right-2 sm:top-4 sm:right-4 z-20 flex items-center space-x-1 sm:space-x-2 backdrop-blur-md bg-white/70 dark:bg-gray-900/70 rounded-2xl px-3 py-2 shadow-lg border border-white/20 dark:border-gray-700/30">
        {/* Bouton Suivre ma commande - Compact avec icône */}
        <Link href="/track-order" className="bg-white/20 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-xs sm:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px]">
          <FaTruck className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className="hidden sm:inline">Ma commande</span>
        </Link>
        
        {user ? (
          <>
            {userRole === 'admin' && (
              <Link
                href="/admin/promo-codes"
                className="bg-blue-600/80 backdrop-blur-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-blue-600 transition-all duration-200 flex items-center text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px]"
                title="Admin - Codes promo"
              >
                Admin
              </Link>
            )}
            {/* Points de fidélité - Compact avec icône */}
            <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-full shadow-md min-h-[36px] sm:min-h-[40px]">
              <FaGift className="text-yellow-400 h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="text-white text-xs sm:text-sm font-semibold">{userPoints}</span>
            </div>
            
            {/* Profil - Icône seule */}
            <Link href="/profile" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center">
              <FaUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            </Link>
            
            {/* Déconnexion - Icône seule */}
            <button
              onClick={handleLogout}
              className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-red-500/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center"
              title="Déconnexion"
            >
              <FaSignOutAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </>
        ) : (
          <>
            {/* Connexion - Icône seule */}
            <Link href="/login" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center" title="Connexion">
              <FaSignInAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
            
            {/* Inscription - Icône seule */}
            <Link href="/register" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center" title="Inscription">
              <FaUserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </Link>
          </>
        )}
        
        {/* Panier flottant - Icône avec badge */}
        {cartItemCount > 0 && (
          <button
            onClick={() => setShowFloatingCart(!showFloatingCart)}
            className="relative bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[40px] min-w-[36px] sm:min-w-[40px] flex items-center justify-center"
          >
            <FaShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-bold shadow-sm">
              {cartItemCount}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
