'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';
import { 
  FaShoppingCart, 
  FaUser, 
  FaSignInAlt, 
  FaUserPlus, 
  FaGift,
  FaSignOutAlt,
  FaUtensils
} from 'react-icons/fa';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [cartItemCount, setCartItemCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: userData } = await supabase
          .from('users')
          .select('role, points_fidelite')
          .eq('id', session.user.id)
          .single();
        if(userData) {
          setUserPoints(userData.points_fidelite || 0);
        }
      }
    };

    const loadCart = () => {
      const savedCart = safeLocalStorage.getJSON('cart');
      if (savedCart) {
        setCartItemCount(savedCart.items.reduce((total, item) => total + item.quantity, 0));
      }
    };

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    checkUser();
    loadCart();

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserPoints(0);
    router.push('/');
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-1.5 fold:px-1.5 xs:px-2 sm:px-3 md:px-4 lg:px-8">
        <div className="flex items-center justify-between h-10 fold:h-10 xs:h-12 sm:h-14 md:h-16">
          {/* Logo CVN'EAT - Optimisé mobile et foldable */}
          <Link href="/" className="flex items-center space-x-1 fold:space-x-1 xs:space-x-1.5 sm:space-x-2 md:space-x-3 min-w-0 flex-shrink-0">
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 fold:w-6 fold:h-6 xs:w-7 xs:h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-lg fold:rounded-lg xs:rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-3 h-3 fold:w-3 fold:h-3 xs:w-4 xs:h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-white rounded-md fold:rounded-md xs:rounded-lg flex items-center justify-center">
                  <FaUtensils className="h-2 w-2 fold:h-2 fold:w-2 xs:h-2.5 xs:w-2.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-600" />
                </div>
              </div>
              <div className="absolute -top-0.5 -right-0.5 fold:-top-0.5 fold:-right-0.5 xs:-top-0.5 xs:-right-0.5 sm:-top-1 sm:-right-1 md:-top-1 md:-right-1 w-2 h-2 fold:w-2 fold:h-2 xs:w-2.5 xs:h-2.5 sm:w-3 sm:h-3 md:w-5 md:h-5 bg-green-500 rounded-full border-1.5 fold:border-1.5 xs:border-2 sm:border-2 md:border-3 border-white shadow-md animate-pulse"></div>
              <div className="absolute -bottom-0.5 -left-0.5 fold:-bottom-0.5 fold:-left-0.5 xs:-bottom-0.5 xs:-left-0.5 sm:-bottom-1 sm:-left-1 md:-bottom-1 md:-left-1 w-1 h-1 fold:w-1 fold:h-1 xs:w-1.5 xs:h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full border fold:border xs:border-1.5 sm:border-2 border-white"></div>
            </div>
            <div className="flex flex-col min-w-0 relative">
              <span className="text-sm fold:text-sm xs:text-base sm:text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent tracking-tight leading-tight">
                CVN'EAT
              </span>
              <span className="text-[9px] fold:text-[9px] xs:text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 -mt-0.5 fold:-mt-0.5 xs:-mt-0.5 sm:-mt-1 font-medium hidden fold:hidden xs:hidden sm:block">Excellence culinaire</span>
            </div>
          </Link>

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-6 lg:space-x-8">
            <Link href="/restaurants" className="text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-sm lg:text-base">
              Restaurants
            </Link>

            <Link href="/devenir-partenaire" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium text-sm lg:text-base">
              Devenir partenaire
            </Link>
            <Link href="/advertise" className="text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors font-medium text-sm lg:text-base">
              Publicité
            </Link>
          </div>

          {/* Right Side - Desktop */}
          <div className="hidden md:flex items-center space-x-2 lg:space-x-3 xl:space-x-4">
            {/* Points de fidélité */}
            {user && (
              <div className="flex items-center space-x-1 bg-yellow-100 dark:bg-yellow-900/30 px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg">
                <FaGift className="h-3 w-3 lg:h-4 lg:w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                <span className="text-xs lg:text-sm font-medium text-yellow-800 dark:text-yellow-200">{userPoints} pts</span>
              </div>
            )}
            
            {/* Panier */}
            {cartItemCount > 0 && (
              <button
                onClick={() => router.push('/panier')}
                className="relative bg-orange-600 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg flex items-center space-x-1 lg:space-x-2 hover:bg-orange-700 transition-colors text-xs lg:text-sm"
              >
                <FaShoppingCart className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                <span className="hidden lg:inline">{cartItemCount} articles</span>
                <span className="absolute -top-1 -right-1 lg:-top-2 lg:-right-2 bg-red-500 text-white text-[10px] lg:text-xs rounded-full h-4 w-4 lg:h-5 lg:w-5 flex items-center justify-center font-bold">
                  {cartItemCount}
                </span>
              </button>
            )}
            
            {/* Boutons de connexion/inscription */}
            {user ? (
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <Link href="/profile" className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors text-xs lg:text-sm">
                  <FaUser className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">Profil</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-xs lg:text-sm"
                >
                  <FaSignOutAlt className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 lg:space-x-2">
                <Link 
                  href="/login" 
                  className="flex items-center space-x-1 bg-blue-600 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg hover:bg-blue-700 transition-colors text-xs lg:text-sm"
                >
                  <FaSignInAlt className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">Connexion</span>
                </Link>
                <Link 
                  href="/register" 
                  className="flex items-center space-x-1 bg-green-600 text-white px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg hover:bg-green-700 transition-colors text-xs lg:text-sm"
                >
                  <FaUserPlus className="h-3 w-3 lg:h-4 lg:w-4 flex-shrink-0" />
                  <span className="hidden lg:inline">Inscription</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button - Optimisé */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 sm:h-6 sm:w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu - Optimisé pour Android */}
        {isMenuOpen && (
          <div className="md:hidden py-2 sm:py-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex flex-col space-y-2 sm:space-y-3">
              {/* Points de fidélité mobile */}
              {user && (
                <div className="flex items-center space-x-2 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-2 rounded-lg">
                  <FaGift className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{userPoints} points de fidélité</span>
                </div>
              )}

              <Link
                href="/restaurants"
                className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2 px-2 text-sm sm:text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Restaurants
              </Link>

              <Link
                href="/devenir-partenaire"
                className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2 px-2 text-sm sm:text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Devenir partenaire
              </Link>
              <Link
                href="/advertise"
                className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2 px-2 text-sm sm:text-base"
                onClick={() => setIsMenuOpen(false)}
              >
                Publicité
              </Link>
              
              {/* Panier mobile */}
              {cartItemCount > 0 && (
                <button
                  onClick={() => {
                    router.push('/panier');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2 px-2 text-left text-sm sm:text-base"
                >
                  <FaShoppingCart className="h-4 w-4 flex-shrink-0" />
                  <span>Panier ({cartItemCount} articles)</span>
                </button>
              )}

              {/* Boutons mobile */}
              {user ? (
                <>
                  <Link
                    href="/profile"
                    className="text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-2 px-2 text-sm sm:text-base"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 transition-colors text-left py-2 px-2 text-sm sm:text-base"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    href="/login"
                    className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm sm:text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 transition-colors text-center text-sm sm:text-base font-medium"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Inscription
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
} 