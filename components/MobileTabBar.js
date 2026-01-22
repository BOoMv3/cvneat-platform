'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { FaHome, FaSearch, FaShoppingCart, FaUser } from 'react-icons/fa';
import { safeLocalStorage } from '@/lib/localStorage';

function getCartCount() {
  try {
    const saved = safeLocalStorage.getJSON('cart');
    const items = Array.isArray(saved?.items) ? saved.items : Array.isArray(saved) ? saved : [];
    return items.reduce((sum, it) => sum + (parseInt(it?.quantity ?? 1, 10) || 0), 0);
  } catch {
    return 0;
  }
}

function shouldHideForPath(pathname) {
  if (!pathname) return true;
  // Éviter de polluer les dashboards / pages sensibles
  const blockedPrefixes = ['/admin', '/partner', '/delivery', '/restaurant'];
  if (blockedPrefixes.some((p) => pathname.startsWith(p))) return true;
  // Checkout/payment: barre en bas peut gêner
  const blockedExact = ['/checkout'];
  if (blockedExact.includes(pathname)) return true;
  return false;
}

export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);

  const hidden = useMemo(() => shouldHideForPath(pathname), [pathname]);

  useEffect(() => {
    if (hidden) return;
    const refresh = () => setCartCount(getCartCount());
    refresh();

    const onStorage = () => refresh();
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };

    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [hidden]);

  if (hidden) return null;

  const isActive = (target) => {
    if (target === '/') return pathname === '/';
    return pathname?.startsWith(target);
  };

  return (
    <>
      {/* Spacer pour éviter que le contenu soit caché par la barre */}
      <div className="h-16 md:hidden" aria-hidden="true" />

      <nav
        className="fixed left-0 right-0 bottom-0 z-[80] md:hidden bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Navigation"
      >
        <div className="grid grid-cols-4">
          <Link
            href="/"
            className={`flex flex-col items-center justify-center py-2.5 text-xs font-semibold ${
              isActive('/') ? 'text-orange-600' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <FaHome className="h-5 w-5" />
            <span className="mt-1">Accueil</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              // Aller sur l'accueil et focus recherche
              const qs = `?focus=search&t=${Date.now()}`;
              if (pathname === '/') {
                router.replace(`/${qs}`);
              } else {
                router.push(`/${qs}`);
              }
            }}
            className={`flex flex-col items-center justify-center py-2.5 text-xs font-semibold ${
              isActive('/search') ? 'text-orange-600' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <FaSearch className="h-5 w-5" />
            <span className="mt-1">Rechercher</span>
          </button>

          <Link
            href="/panier"
            className={`relative flex flex-col items-center justify-center py-2.5 text-xs font-semibold ${
              isActive('/panier') ? 'text-orange-600' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <FaShoppingCart className="h-5 w-5" />
            <span className="mt-1">Panier</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-6 bg-red-500 text-white text-[10px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center font-bold">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/profile"
            className={`flex flex-col items-center justify-center py-2.5 text-xs font-semibold ${
              isActive('/profile') ? 'text-orange-600' : 'text-gray-600 dark:text-gray-300'
            }`}
          >
            <FaUser className="h-5 w-5" />
            <span className="mt-1">Compte</span>
          </Link>
        </div>
      </nav>
    </>
  );
}


