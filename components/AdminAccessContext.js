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
          Mode associé — lecture seule : vous voyez tout comme l’admin, sans pouvoir modifier.
        </div>
      )}
      {children}
    </AdminAccessContext.Provider>
  );
}
