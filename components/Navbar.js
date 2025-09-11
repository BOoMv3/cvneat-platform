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
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo CVN'EAT */}
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

          {/* Navigation Links - Desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/restaurants" className="text-gray-700 hover:text-orange-600 transition-colors">
              Restaurants
            </Link>
            <Link href="/delivery-zones" className="text-gray-700 hover:text-orange-600 transition-colors">
              Zones de livraison
            </Link>

            <Link href="/devenir-partenaire" className="text-gray-600 hover:text-orange-600 transition-colors font-medium">
              Devenir partenaire
            </Link>
          </div>

          {/* Right Side - Desktop */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {/* Points de fidélité */}
            {user && (
              <div className="flex items-center space-x-1 sm:space-x-2 bg-yellow-100 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg">
                <FaGift className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-600" />
                <span className="text-xs sm:text-sm font-medium text-yellow-800">{userPoints} pts</span>
              </div>
            )}
            
            {/* Panier */}
            {cartItemCount > 0 && (
              <button
                onClick={() => router.push('/panier')}
                className="relative bg-orange-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg flex items-center space-x-1 sm:space-x-2 hover:bg-orange-700 transition-colors"
              >
                <FaShoppingCart className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="text-xs sm:text-sm">{cartItemCount} articles</span>
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              </button>
            )}
            
            {/* Boutons de connexion/inscription */}
            {user ? (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link href="/profil" className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-orange-600 transition-colors">
                  <FaUser className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Profil</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 sm:space-x-2 text-gray-600 hover:text-red-600 transition-colors"
                >
                  <FaSignOutAlt className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Déconnexion</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 sm:space-x-3">
                <Link 
                  href="/login" 
                  className="flex items-center space-x-1 sm:space-x-2 bg-blue-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FaSignInAlt className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Connexion</span>
                </Link>
                <Link 
                  href="/register" 
                  className="flex items-center space-x-1 sm:space-x-2 bg-green-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <FaUserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="text-xs sm:text-sm">Inscription</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-gray-600 hover:text-orange-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
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

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t">
            <div className="flex flex-col space-y-3 sm:space-y-4">
              {/* Points de fidélité mobile */}
              {user && (
                <div className="flex items-center space-x-2 bg-yellow-100 px-3 py-2 rounded-lg">
                  <FaGift className="h-4 w-4 text-yellow-600" />
                  <span className="text-sm font-medium text-yellow-800">{userPoints} points de fidélité</span>
                </div>
              )}

              <Link
                href="/restaurants"
                className="text-gray-600 hover:text-orange-600 transition-colors py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Restaurants
              </Link>
              <Link
                href="/delivery-zones"
                className="text-gray-600 hover:text-orange-600 transition-colors py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Zones de livraison
              </Link>

              <Link
                href="/devenir-partenaire"
                className="text-gray-600 hover:text-orange-600 transition-colors py-1"
                onClick={() => setIsMenuOpen(false)}
              >
                Devenir partenaire
              </Link>
              
              {/* Panier mobile */}
              {cartItemCount > 0 && (
                <button
                  onClick={() => {
                    router.push('/panier');
                    setIsMenuOpen(false);
                  }}
                  className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors py-1"
                >
                  <FaShoppingCart className="h-4 w-4" />
                  <span>Panier ({cartItemCount} articles)</span>
                </button>
              )}

              {/* Boutons mobile */}
              {user ? (
                <>
                  <Link
                    href="/profil"
                    className="text-gray-600 hover:text-orange-600 transition-colors py-1"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Mon profil
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsMenuOpen(false);
                    }}
                    className="text-red-600 hover:text-red-700 transition-colors text-left py-1"
                  >
                    Déconnexion
                  </button>
                </>
              ) : (
                <div className="flex flex-col space-y-2 pt-2">
                  <Link
                    href="/login"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-center text-sm"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Connexion
                  </Link>
                  <Link
                    href="/register"
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-center text-sm"
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