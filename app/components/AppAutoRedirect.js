'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const isCapacitorApp = () =>
  typeof window !== 'undefined' &&
  (window.location?.protocol === 'capacitor:' ||
    window.location?.href?.startsWith('capacitor://') ||
    !!window.Capacitor);

const normalizeRole = (role) => (role || '').toString().trim().toLowerCase();

/**
 * Dans l'app mobile (Capacitor), forcer la navigation vers le bon dashboard.
 *
 * Problèmes visés:
 * - Après un retour du background, la WebView peut retomber sur '/' (accueil).
 * - Certains comptes ont le rôle "livreur" (et pas uniquement "delivery").
 *
 * Comportement:
 * - Si connecté et rôle delivery/livreur: forcer /delivery/dashboard dès qu'on est hors /delivery
 *   (inclut '/', /login, etc.).
 * - Si connecté et rôle restaurant/partner: forcer /partner dès qu'on est sur '/' (accueil).
 */
export default function AppAutoRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const runningRef = useRef(false);
  const lastForcedAtRef = useRef(0);

  useEffect(() => {
    if (!isCapacitorApp()) return;
    if (!pathname) return;

    let cancelled = false;

    const forceTo = (target, reason, extra = {}) => {
      const now = Date.now();
      // Anti-boucle: ne pas forcer trop souvent
      if (now - lastForcedAtRef.current < 800) return;
      lastForcedAtRef.current = now;

      console.log('[AppAutoRedirect] Force navigation:', { to: target, from: pathname, reason, ...extra });

      // 1) Essayer via Next router (SPA)
      try {
        router.replace(target);
      } catch {
        // ignore
      }

      // 2) Fallback robuste: si la navigation SPA ne se fait pas (WebView resume),
      // on force un reload sur une route qui existe en statique (out/).
      setTimeout(() => {
        try {
          if (window.location?.pathname !== target) {
            window.location.replace(target);
          }
        } catch {
          // ignore
        }
      }, 400);
    };

    async function run(reason = 'mount') {
      if (runningRef.current) return;
      runningRef.current = true;
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.access_token || !session?.user) {
        runningRef.current = false;
        return;
      }

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

      const isDelivery = role === 'delivery' || role === 'livreur';
      const isRestaurant = role === 'restaurant' || role === 'partner';

      // IMPORTANT:
      // En app mobile, un utilisateur livreur ne doit pas rester sur l'accueil
      // (et éviter qu'il doive fermer/réouvrir l'app). On le force vers /delivery.
      if (isDelivery) {
        if (!pathname.startsWith('/delivery')) {
          forceTo('/delivery/dashboard', reason, { role });
        }
        runningRef.current = false;
        return;
      }

      // Restaurant/partner: rediriger uniquement si on est sur l'accueil
      if (isRestaurant && pathname === '/') {
        forceTo('/partner', reason, { role });
      }

      runningRef.current = false;
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run('visibilitychange');
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Capacitor AppStateChange (plus fiable que visibilitychange)
    let removeAppListener = null;
    (async () => {
      try {
        const AppPlugin = window.Capacitor?.Plugins?.App;
        if (AppPlugin?.addListener) {
          const listener = await AppPlugin.addListener('appStateChange', ({ isActive }) => {
            if (isActive) run('appStateChange');
          });
          removeAppListener = () => listener.remove();
        }
      } catch {
        // ignore
      }
    })();

    // Re-run when auth state changes (session restored late / refresh token)
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      run('authStateChange');
    });

    // Run initial
    run('mount');

    // Retry shortly after mount (WKWebView parfois hydrate la session après)
    const t1 = setTimeout(() => run('retry_1s'), 1000);
    const t3 = setTimeout(() => run('retry_3s'), 3000);

    return () => {
      cancelled = true;
      runningRef.current = false;
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(t1);
      clearTimeout(t3);
      try {
        removeAppListener && removeAppListener();
      } catch {
        // ignore
      }
      try {
        authListener?.subscription?.unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [pathname, router]);

  return null;
}


