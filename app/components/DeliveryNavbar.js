'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaMotorcycle, 
  FaUser, 
  FaSignOutAlt,
  FaBell,
  FaHome,
  FaChartLine,
  FaCog
} from 'react-icons/fa';

export default function DeliveryNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center">
            <Link href="/delivery/dashboard" className="flex items-center space-x-2">
              <div className="bg-orange-500 text-white p-2 rounded-lg">
                <FaMotorcycle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">CVN'EAT</h1>
                <p className="text-xs text-gray-600">Livreur</p>
              </div>
            </Link>
          </div>

          {/* Navigation desktop */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              href="/delivery/dashboard" 
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
            >
              <FaHome className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            
            <Link 
              href="/delivery/history" 
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
            >
              <FaChartLine className="h-4 w-4" />
              <span>Historique</span>
            </Link>

            <Link 
              href="/delivery/reviews" 
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
            >
              <FaBell className="h-4 w-4" />
              <span>Avis</span>
            </Link>

            <Link 
              href="/delivery/profile" 
              className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
            >
              <FaCog className="h-4 w-4" />
              <span>Profil</span>
            </Link>
          </div>

          {/* Menu utilisateur */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="text-sm text-gray-700">
                  <span className="font-medium">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-red-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="text-gray-700 hover:text-orange-600 px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1"
              >
                <FaUser className="h-4 w-4" />
                <span>Connexion</span>
              </Link>
            )}

            {/* Menu mobile */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-700 hover:text-orange-600 p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Menu mobile */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-gray-50">
              <Link 
                href="/delivery/dashboard" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaHome className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              
              <Link 
                href="/delivery/history" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaChartLine className="h-4 w-4" />
                <span>Historique</span>
              </Link>

              <Link 
                href="/delivery/reviews" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaBell className="h-4 w-4" />
                <span>Avis</span>
              </Link>

              <Link 
                href="/delivery/profile" 
                className="text-gray-700 hover:text-orange-600 block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <FaCog className="h-4 w-4" />
                <span>Profil</span>
              </Link>

              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="text-gray-700 hover:text-red-600 block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2 w-full text-left"
                >
                  <FaSignOutAlt className="h-4 w-4" />
                  <span>Déconnexion</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
