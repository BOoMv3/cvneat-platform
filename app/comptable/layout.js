'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import ComptableShell from '../../components/comptable/ComptableShell';

export default function ComptableLayout({ children }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      let role = null;
      try {
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (res.ok) {
          const me = await res.json();
          role = (me?.role || '').toString().trim().toLowerCase();
          setEmail(me?.email || session.user?.email || '');
        }
      } catch {
        // ignore
      }

      if (!role) {
        const { data } = await supabase.from('users').select('role, email').eq('id', session.user.id).maybeSingle();
        role = (data?.role || '').toString().trim().toLowerCase();
        setEmail(data?.email || session.user?.email || '');
      }

      if (role !== 'comptable' && role !== 'admin') {
        router.push('/');
        return;
      }

      setReady(true);
    };
    check();
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return <ComptableShell userEmail={email}>{children}</ComptableShell>;
}
