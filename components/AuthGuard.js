'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';

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

      // Recuperer le role de l'utilisateur
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !userData) {
        // Erreur ou pas de profil
        router.push('/login');
        return;
      }

      // Les admins ont accès à tout
      if (userData.role === 'admin') {
        setStatus('authenticated');
        return;
      }

      const userRoles = userData.role ? userData.role.split(',') : [userData.role];
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