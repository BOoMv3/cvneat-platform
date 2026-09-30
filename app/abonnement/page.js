'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';

/** CVN'EAT Plus temporairement retiré de l’offre. */
export default function AbonnementPage() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace('/'), 4000);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-orange-100 bg-white p-8 text-center shadow-lg shadow-orange-500/10">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">CVN&apos;EAT</p>
        <h1 className="mt-3 text-2xl font-black text-gray-900 sm:text-3xl">
          Offre temporairement indisponible
        </h1>
        <p className="mt-3 text-sm text-gray-600">
          CVN&apos;EAT Plus n&apos;est plus proposé pour le moment. Vous êtes redirigé vers l&apos;accueil.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white hover:bg-orange-600"
        >
          <FaArrowLeft className="h-3 w-3" />
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
