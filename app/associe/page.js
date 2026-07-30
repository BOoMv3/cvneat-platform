'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** L’associé utilise désormais la même interface que l’admin (lecture seule). */
export default function AssocieRedirectPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/admin');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-600 text-sm">
      Redirection vers l’espace admin…
    </div>
  );
}
