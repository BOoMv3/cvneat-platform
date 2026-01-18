'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function AuthGuard({ children, requiredRole }) {
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
          role = (me?.role || '').toString().trim().toLowerCase();
        }
      } catch (e) {
        // ignore
      }

      // Fallback metadata
      if (!role) {
        role = (session.user?.user_metadata?.role || '').toString().trim().toLowerCase() || null;
      }

      if (!role) {
        router.push('/login');
        return;
      }

      // Les admins ont accès à tout
      if (role === 'admin') {
        setStatus('authenticated');
        return;
      }

      const userRoles = role ? role.split(',') : [role];
      if (requiredRole && !userRoles.includes(requiredRole)) {
        // Mauvais role (sauf admin qui a déjà été vérifié)
        router.push('/'); // Rediriger vers la page d'accueil
        return;
      }
      
      // Tout est bon
      setStatus('authenticated');
    };

    checkAuth();
  }, [requiredRole, router]);

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