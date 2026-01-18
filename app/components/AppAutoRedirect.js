'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const isCapacitorApp = () =>
  typeof window !== 'undefined' &&
  (window.location?.protocol === 'capacitor:' ||
    window.location?.href?.startsWith('capacitor://') ||
    !!window.Capacitor);

const normalizeRole = (role) => (role || '').toString().trim().toLowerCase();

/**
 * Dans l'app mobile, si une session existe déjà et qu'on est sur '/',
 * rediriger directement vers le bon dashboard.
 */
export default function AppAutoRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isCapacitorApp()) return;
    if (!pathname || pathname !== '/') return;

    let cancelled = false;

    async function run() {
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.access_token || !session?.user) return;

      // 1) Essayer via API (bypass RLS côté serveur)
      let role = '';
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const me = await res.json();
          role = normalizeRole(me?.role);
        }
      } catch {
        // ignore
      }

      // 2) Fallback metadata
      if (!role) {
        role = normalizeRole(session.user?.user_metadata?.role);
      }

      // 3) Fallback restaurant par présence d'une fiche
      if (!role) {
        try {
          const byUser = await supabase
            .from('restaurants')
            .select('id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          if (byUser.data?.id) role = 'restaurant';
        } catch {
          // ignore
        }
      }

      if (cancelled) return;

      if (role === 'delivery') router.replace('/delivery/dashboard');
      else if (role === 'restaurant' || role === 'partner') router.replace('/partner');
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}


