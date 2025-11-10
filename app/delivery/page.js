'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeliveryDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/delivery/dashboard');
  }, [router]);

  return (
    <main className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
      <div className="bg-white shadow-lg rounded-2xl px-6 py-8 max-w-md text-center">
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Redirection vers le tableau de bord avancé…</h1>
        <p className="text-gray-600 text-sm">
          Merci de patienter pendant que nous ouvrons le tableau de bord livreur. Si la page ne change pas automatiquement,
          <button
            onClick={() => router.push('/delivery/dashboard')}
            className="text-indigo-600 font-medium ml-1 underline"
          >
            cliquez ici
          </button>
          .
        </p>
      </div>
    </main>
  );
}
