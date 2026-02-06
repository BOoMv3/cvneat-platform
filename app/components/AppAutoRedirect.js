'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/localStorage';

const isCapacitorApp = () =>
  typeof window !== 'undefined' &&
  (window.location?.protocol === 'capacitor:' ||
    window.location?.href?.startsWith('capacitor://') ||
    !!window.Capacitor);

const normalizeRole = (role) => (role || '').toString().trim().toLowerCase();
const ROLE_CACHE_KEY = 'cvneat-role-cache';

const getCachedRole = () => {
  try {
    const cached = safeLocalStorage.getJSON(ROLE_CACHE_KEY);
    const r = normalizeRole(cached?.role);
    return r || '';
  } catch {
    return '';
  }
};

const setCachedRole = (role) => {
  const r = normalizeRole(role);
  if (!r) return;
  try {
    safeLocalStorage.setJSON(ROLE_CACHE_KEY, { role: r, at: Date.now() });
  } catch {
    // ignore
  }
};

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
  const pollRef = useRef(null);
  const pollUntilRef = useRef(0);

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

    const stopPolling = () => {
      try {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      } catch {
        // ignore
      }
      pollUntilRef.current = 0;
    };

    const schedulePolling = (reason) => {
      // On ne poll que si on n'est pas déjà sur la cible (cas typique: resume -> '/')
      // et uniquement dans l'app mobile.
      if (pathname === '/delivery/dashboard') return;

      const now = Date.now();
      if (!pollUntilRef.current || pollUntilRef.current < now) {
        pollUntilRef.current = now + 15000; // 15s max
      }

      if (pollRef.current) return;

      pollRef.current = setInterval(() => {
        if (Date.now() > pollUntilRef.current) {
          stopPolling();
          return;
        }
        run(`poll_${reason}`).catch(() => {});
      }, 900);
    };

    const enforceFromCache = (reason) => {
      const cachedRole = getCachedRole();
      const isDelivery = cachedRole === 'delivery' || cachedRole === 'livreur';
      if (isDelivery && pathname !== '/delivery/dashboard') {
        forceTo('/delivery/dashboard', `cache_${reason}`, { role: cachedRole });
        return true;
      }
      return false;
    };

    async function run(reason = 'mount') {
      if (runningRef.current) return;
      runningRef.current = true;
      const { data } = await supabase.auth.getSession();
      const session = data?.session;
      if (!session?.access_token || !session?.user) {
        // IMPORTANT: sur iOS, la session peut se restaurer après plusieurs secondes au resume.
        // Donc on repoll tant qu'on est dans l'app et hors dashboard.
        runningRef.current = false;
        // Si on a déjà un rôle cache, on peut forcer sans attendre la session
        enforceFromCache(reason);
        schedulePolling(reason);
        return;
      }

      // Session OK => on peut stopper le polling
      stopPolling();

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

      // 3) Fallback cache local (utile en resume iOS si réseau instable)
      if (!role) {
        role = getCachedRole();
      }

      // 4) Fallback DB users (souvent autorisé via RLS: lecture de son propre profil)
      if (!role) {
        try {
          const byUsers = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          if (byUsers?.data?.role) {
            role = normalizeRole(byUsers.data.role);
          }
        } catch {
          // ignore
        }
      }

      // 5) Fallback restaurant par présence d'une fiche (si policies le permettent)
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

      if (role) setCachedRole(role);

      // IMPORTANT:
      // En app mobile, un utilisateur livreur ne doit pas rester sur l'accueil
      // (et éviter qu'il doive fermer/réouvrir l'app). On le force vers /delivery.
      if (isDelivery) {
        // Exigence: le livreur ne doit accéder à rien d'autre que son dashboard.
        if (pathname !== '/delivery/dashboard') {
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
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        try {
          safeLocalStorage.removeItem(ROLE_CACHE_KEY);
        } catch {
          // ignore
        }
      }
      run('authStateChange');
    });

    // Run initial
    // Avant tout: si on a déjà le rôle en cache, verrouiller immédiatement
    enforceFromCache('pre_run');
    run('mount');

    // Retry shortly after mount (WKWebView parfois hydrate la session après)
    const t1 = setTimeout(() => run('retry_1s'), 1000);
    const t3 = setTimeout(() => run('retry_3s'), 3000);
    const t8 = setTimeout(() => run('retry_8s'), 8000);
    const t15 = setTimeout(() => run('retry_15s'), 15000);

    // Watchdog: si des évènements iOS ne se déclenchent pas, on force via cache (léger, sans réseau)
    const cacheTick = setInterval(() => {
      if (document.visibilityState === 'visible') enforceFromCache('tick');
    }, 1200);

    return () => {
      cancelled = true;
      runningRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
      clearTimeout(t1);
      clearTimeout(t3);
      clearTimeout(t8);
      clearTimeout(t15);
      clearInterval(cacheTick);
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


