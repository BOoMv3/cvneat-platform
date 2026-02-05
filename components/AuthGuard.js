'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';

const normalizeRole = (role) => (role || '').toString().trim().toLowerCase();
const ROLE_CACHE_KEY = 'cvneat-role-cache';

const getCachedRole = () => {
  try {
    const cached = safeLocalStorage.getJSON(ROLE_CACHE_KEY);
    return normalizeRoleAliases(cached?.role) || null;
  } catch {
    return null;
  }
};

const setCachedRole = (role) => {
  const r = normalizeRoleAliases(role);
  if (!r) return;
  try {
    safeLocalStorage.setJSON(ROLE_CACHE_KEY, { role: r, at: Date.now() });
  } catch {
    // ignore
  }
};

const normalizeRoleAliases = (role) => {
  const r = normalizeRole(role);
  // alias: legacy FR naming
  if (r === 'livreur') return 'delivery';
  return r;
};

export default function AuthGuard({ children, requiredRole, allowedRoles }) {
  const router = useRouter();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // Pas d'utilisateur connecte
        router.push('/login');
        return;
      }

      // Récupérer le rôle via API (bypass RLS côté serveur)
      let role = null;
      try {
        const res = await fetch('/api/users/me', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        });
        if (res.ok) {
          const me = await res.json();
          role = normalizeRoleAliases(me?.role);
        }
      } catch (e) {
        // ignore
      }

      // Fallback metadata
      if (!role) {
        role = normalizeRoleAliases(session.user?.user_metadata?.role) || null;
      }

      // Fallback cache (utile sur iOS resume si réseau lent)
      if (!role) {
        role = getCachedRole();
      }

      // Fallback DB users (lecture de son propre profil via RLS)
      if (!role) {
        try {
          const r = await supabase
            .from('users')
            .select('role')
            .eq('id', session.user.id)
            .maybeSingle();
          if (r?.data?.role) role = normalizeRoleAliases(r.data.role);
        } catch {
          // ignore
        }
      }

      if (!role) {
        router.push('/login');
        return;
      }

      setCachedRole(role);

      // Les admins ont accès à tout
      if (role === 'admin') {
        setStatus('authenticated');
        return;
      }

      const userRoles = (role ? role.split(',') : [role]).map(normalizeRoleAliases).filter(Boolean);

      // Compat: certains écrans passent allowedRoles (array), d'autres requiredRole (string)
      const required = Array.isArray(allowedRoles) && allowedRoles.length > 0
        ? allowedRoles.map(normalizeRoleAliases)
        : requiredRole
          ? [normalizeRoleAliases(requiredRole)]
          : [];

      if (required.length > 0 && !required.some((r) => userRoles.includes(r))) {
        // Mauvais role (sauf admin qui a déjà été vérifié)
        router.push('/'); // Rediriger vers la page d'accueil
        return;
      }
      
      // Tout est bon
      setStatus('authenticated');
    };

    checkAuth();
  }, [requiredRole, allowedRoles, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (status === 'authenticated') {
    return <>{children}</>;
  }

  return null;
} 