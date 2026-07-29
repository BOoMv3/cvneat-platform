'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaMotorcycle, 
  FaUser, 
  FaSignOutAlt,
  FaBell,
  FaHome,
  FaChartLine,
  FaCog,
  FaTrophy,
  FaComments,
  FaFileInvoice
} from 'react-icons/fa';

const navLinkClass = (active) =>
  `px-2.5 py-2 rounded-md text-sm font-medium flex items-center gap-1.5 ${
    active ? 'bg-orange-50 text-orange-700' : 'text-gray-700 hover:text-orange-600'
  }`;

export default function DeliveryNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

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
    <nav className="bg-white shadow-lg border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16 gap-2">
          <Link href="/delivery/dashboard" className="flex items-center space-x-2 shrink-0">
            <div className="bg-orange-500 text-white p-2 rounded-lg">
              <FaMotorcycle className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="hidden xs:block sm:block">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">CVN&apos;EAT</h1>
              <p className="text-[10px] sm:text-xs text-gray-600">Livreur</p>
            </div>
          </Link>

          {/* Liens essentiels toujours visibles (mobile + desktop) */}
          <div className="flex items-center gap-0.5 sm:gap-1 flex-1 justify-end sm:justify-center overflow-x-auto">
            <Link href="/delivery/dashboard" className={navLinkClass(pathname === '/delivery/dashboard')}>
              <FaHome className="h-4 w-4" />
              <span className="hidden lg:inline">Dashboard</span>
            </Link>
            <Link href="/delivery/messages" className={navLinkClass(pathname?.startsWith('/delivery/messages'))}>
              <FaComments className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Messages</span>
            </Link>
            <Link href="/delivery/factures" className={navLinkClass(pathname?.startsWith('/delivery/factures'))}>
              <FaFileInvoice className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Factures</span>
            </Link>
            <Link href="/delivery/profile" className={navLinkClass(pathname?.startsWith('/delivery/profile'))}>
              <FaCog className="h-4 w-4" />
              <span className="text-xs sm:text-sm">Profil</span>
            </Link>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {user && (
              <button
                onClick={handleLogout}
                className="hidden md:flex text-gray-700 hover:text-red-600 px-2 py-2 rounded-md text-sm font-medium items-center gap-1"
                title="Déconnexion"
              >
                <FaSignOutAlt className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-orange-600 p-2"
              aria-label="Menu"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="pb-3 border-t">
            <div className="px-1 pt-2 space-y-1">
              <Link href="/delivery/history" className="text-gray-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                <FaChartLine className="h-4 w-4" /> Historique
              </Link>
              <Link href="/delivery/reviews" className="text-gray-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                <FaBell className="h-4 w-4" /> Avis
              </Link>
              <Link href="/delivery/leaderboard" className="text-gray-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                <FaTrophy className="h-4 w-4" /> Classement
              </Link>
              <Link href="/delivery/messages" className="text-orange-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold" onClick={() => setIsMenuOpen(false)}>
                <FaComments className="h-4 w-4" /> Messages / Chat
              </Link>
              <Link href="/delivery/factures" className="text-orange-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold" onClick={() => setIsMenuOpen(false)}>
                <FaFileInvoice className="h-4 w-4" /> Factures
              </Link>
              <Link href="/delivery/profile" className="text-orange-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold" onClick={() => setIsMenuOpen(false)}>
                <FaCog className="h-4 w-4" /> Profil · SIRET / KBIS
              </Link>
              {!user && (
                <Link href="/login" className="text-gray-700 hover:bg-orange-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium" onClick={() => setIsMenuOpen(false)}>
                  <FaUser className="h-4 w-4" /> Connexion
                </Link>
              )}
              {user && (
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="text-red-600 hover:bg-red-50 flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium w-full text-left"
                >
                  <FaSignOutAlt className="h-4 w-4" /> Déconnexion
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
