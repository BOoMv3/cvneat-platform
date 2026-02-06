/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { safeLocalStorage } from '@/lib/localStorage';
import MobileTabBar from '@/components/MobileTabBar';
import Footer from './Footer';
import CookieBanner from './CookieBanner';

const ROLE_CACHE_KEY = 'cvneat-role-cache';

function readRole() {
  try {
    const w = typeof window !== 'undefined' ? window : null;
    const fromWindow = (w?.__cvneat_role || '').toString().trim().toLowerCase();
    if (fromWindow) return fromWindow;
  } catch {
    // ignore
  }

  try {
    const cached = safeLocalStorage.getJSON(ROLE_CACHE_KEY);
    const r = (cached?.role || '').toString().trim().toLowerCase();
    return r || '';
  } catch {
    return '';
  }
}

export default function RoleAwareChrome() {
  const pathname = usePathname();
  const [role, setRole] = useState('');

  const isDelivery = useMemo(() => role === 'delivery' || role === 'livreur', [role]);
  const isDeliveryPath = useMemo(() => (pathname || '').startsWith('/delivery'), [pathname]);

  useEffect(() => {
    const refresh = () => setRole(readRole());
    refresh();

    const onRole = () => refresh();
    const onStorage = () => refresh();
    window.addEventListener('cvneat-role', onRole);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('cvneat-role', onRole);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Exigence: en app, un livreur ne doit pas accéder à autre chose que le dashboard.
  // Donc on masque totalement le footer / chrome global (liens "Restaurants", CGV, etc.)
  // même si un écran non-livreur apparaît brièvement.
  if (isDelivery || isDeliveryPath) return null;

  return (
    <>
      <MobileTabBar />
      <Footer />
      <CookieBanner />
    </>
  );
}

