'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const CHANNEL = 'cvneat-site-presence';
const GUEST_KEY = 'cvneat-presence-id';
const HEARTBEAT_MS = 40_000;

function isBot() {
  if (typeof navigator === 'undefined') return true;
  return /bot|crawl|spider|slurp|facebookexternalhit|preview/i.test(navigator.userAgent || '');
}

function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `g-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(GUEST_KEY, id);
    }
    return id;
  } catch {
    return `g-${Date.now()}`;
  }
}

function normalizeRole(role) {
  const r = (role || 'guest').toString().trim().toLowerCase();
  if (r === 'livreur') return 'delivery';
  if (r === 'restaurant' || r === 'owner') return 'partner';
  return r || 'guest';
}

/**
 * Signale la présence de l'utilisateur (connecté ou anonyme) sur le canal Realtime.
 * Permet à l'admin de voir qui est en ligne en temps réel.
 */
export default function PresenceTracker() {
  const pathname = usePathname() || '/';
  const channelRef = useRef(null);
  const metaRef = useRef({
    presenceKey: null,
    userId: null,
    email: null,
    name: '',
    role: 'guest',
  });

  useEffect(() => {
    if (typeof window === 'undefined' || isBot()) return undefined;

    let cancelled = false;
    let heartbeatTimer = null;
    let channel = null;

    const buildPayload = () => {
      const meta = metaRef.current;
      return {
        user_id: meta.userId,
        email: meta.email,
        name: meta.name,
        role: meta.role,
        path: pathname,
        guest: !meta.userId,
        online_at: new Date().toISOString(),
        ua: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 120) : '',
      };
    };

    const trackNow = async () => {
      if (!channelRef.current || cancelled) return;
      try {
        await channelRef.current.track(buildPayload());
      } catch (e) {
        // silencieux : pas bloquant pour la navigation
      }
    };

    const resolveIdentity = async () => {
      const guestId = getGuestId();
      let presenceKey = `guest:${guestId}`;
      let userId = null;
      let email = null;
      let name = '';
      let role = 'guest';

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          email = user.email || null;
          presenceKey = `user:${user.id}`;
          name =
            [user.user_metadata?.prenom, user.user_metadata?.nom].filter(Boolean).join(' ') ||
            user.user_metadata?.full_name ||
            '';

          const cached = (() => {
            try {
              return JSON.parse(localStorage.getItem('cvneat-role-cache') || '{}');
            } catch {
              return {};
            }
          })();
          role = normalizeRole(
            cached?.role || user.user_metadata?.role || user.app_metadata?.role || 'user'
          );

          const { data: profile } = await supabase
            .from('users')
            .select('role, prenom, nom, email')
            .eq('id', user.id)
            .maybeSingle();

          if (profile) {
            role = normalizeRole(profile.role || role);
            name =
              [profile.prenom, profile.nom].filter(Boolean).join(' ') ||
              name ||
              '';
            email = profile.email || email;
          }
        }
      } catch {
        // reste invité
      }

      metaRef.current = { presenceKey, userId, email, name, role };
      return presenceKey;
    };

    const start = async () => {
      const presenceKey = await resolveIdentity();
      if (cancelled) return;

      channel = supabase.channel(CHANNEL, {
        config: {
          presence: { key: presenceKey },
        },
      });
      channelRef.current = channel;

      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackNow();
        }
      });

      heartbeatTimer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
        trackNow();
      }, HEARTBEAT_MS);
    };

    start();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== 'SIGNED_IN' && event !== 'SIGNED_OUT') return;
      (async () => {
        if (channelRef.current) {
          try {
            await supabase.removeChannel(channelRef.current);
          } catch {
            // ignore
          }
          channelRef.current = null;
        }
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (!cancelled) await start();
      })();
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') trackNow();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      subscription?.unsubscribe?.();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only on mount; path updates below
  }, []);

  // Mise à jour du chemin sans resubscribe
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch) return;
    const meta = metaRef.current;
    ch.track({
      user_id: meta.userId,
      email: meta.email,
      name: meta.name,
      role: meta.role,
      path: pathname,
      guest: !meta.userId,
      online_at: new Date().toISOString(),
      ua: typeof navigator !== 'undefined' ? (navigator.userAgent || '').slice(0, 120) : '',
    }).catch(() => {});
  }, [pathname]);

  return null;
}
