'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import {
  isAdminViewerRole,
  isAdminWriterRole,
  isAdminReadOnlyRole,
  normalizeStaffRole,
} from '../lib/admin-viewer';

const AdminAccessContext = createContext({
  ready: false,
  role: null,
  readOnly: false,
  canWrite: false,
  userId: null,
});

export function useAdminAccess() {
  return useContext(AdminAccessContext);
}

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function shouldBlockReadonlyMutation(url, method) {
  if (!MUTATING.has(method)) return false;
  // Auth / refresh session : toujours OK
  if (url.includes('/auth/v1/')) return false;
  // Mutations PostgREST (écritures directes supabase.from().insert/update/delete)
  if (url.includes('/rest/v1/')) return true;
  // APIs admin / chat
  if (url.includes('/api/admin')) return true;
  if (url.includes('/api/delivery/dm')) return true;
  return false;
}

export function AdminAccessProvider({ children }) {
  const router = useRouter();
  const [state, setState] = useState({
    ready: false,
    role: null,
    readOnly: false,
    canWrite: false,
    userId: null,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace('/login');
        return;
      }

      let role = null;
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const me = await res.json();
          role = normalizeStaffRole(me?.role);
        }
      } catch {
        /* ignore */
      }

      if (!role) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        role = normalizeStaffRole(data?.role);
      }

      if (!isAdminViewerRole(role)) {
        router.replace('/login');
        return;
      }

      if (!cancelled) {
        setState({
          ready: true,
          role,
          readOnly: isAdminReadOnlyRole(role),
          canWrite: isAdminWriterRole(role),
          userId: session.user.id,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Coupe nette : aucune écriture API / Supabase en mode associé
  useEffect(() => {
    if (!state.ready || !state.readOnly) return undefined;
    if (typeof window === 'undefined' || window.__cvneatReadonlyFetchPatched) {
      return undefined;
    }

    const originalFetch = window.fetch.bind(window);
    window.__cvneatReadonlyFetchPatched = true;
    window.__cvneatOriginalFetch = originalFetch;

    window.fetch = async (input, init = {}) => {
      const url =
        typeof input === 'string'
          ? input
          : input?.url
            ? String(input.url)
            : String(input);
      const method = (init?.method || (typeof input !== 'string' && input?.method) || 'GET')
        .toString()
        .toUpperCase();

      if (shouldBlockReadonlyMutation(url, method)) {
        console.warn('[associe readonly] mutation bloquée:', method, url);
        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(
              new CustomEvent('cvneat-readonly-block', {
                detail: { method, url },
              })
            );
          } catch {
            /* ignore */
          }
        }
        return new Response(
          JSON.stringify({
            error:
              'Lecture seule : le compte associé ne peut rien modifier.',
            code: 'ASSOCIE_READONLY',
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      return originalFetch(input, init);
    };

    const onBlock = () => {
      // Une seule alerte à la fois
      if (window.__cvneatReadonlyAlerting) return;
      window.__cvneatReadonlyAlerting = true;
      try {
        alert('Mode associé — lecture seule : aucune modification possible.');
      } finally {
        setTimeout(() => {
          window.__cvneatReadonlyAlerting = false;
        }, 800);
      }
    };
    window.addEventListener('cvneat-readonly-block', onBlock);

    return () => {
      window.removeEventListener('cvneat-readonly-block', onBlock);
      if (window.__cvneatOriginalFetch) {
        window.fetch = window.__cvneatOriginalFetch;
        delete window.__cvneatOriginalFetch;
        delete window.__cvneatReadonlyFetchPatched;
      }
    };
  }, [state.ready, state.readOnly]);

  const value = useMemo(() => state, [state]);

  if (!state.ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <AdminAccessContext.Provider value={value}>
      {state.readOnly && (
        <div className="sticky top-0 z-[60] bg-amber-500 text-white text-center text-sm font-medium px-3 py-2 shadow">
          Mode associé — lecture seule : vous voyez tout comme l’admin, sans pouvoir
          modifier (virements, messages, restaurants…).
        </div>
      )}
      {children}
    </AdminAccessContext.Provider>
  );
}
