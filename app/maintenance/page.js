'use client';

import Link from 'next/link';
import { FaUtensils, FaTools, FaLock } from 'react-icons/fa';
import { useEffect, useState } from 'react';

const FALLBACK_MESSAGE = 'Maintenance en cours. Nous revenons dès que possible.';

export default function Maintenance() {
  const [message, setMessage] = useState(FALLBACK_MESSAGE);

  useEffect(() => {
    fetch('/api/site-status')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.message) setMessage(data.message);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <div className="max-w-2xl mx-auto px-4 text-center text-white">
        <div className="mb-8">
          <FaUtensils className="w-20 h-20 mx-auto mb-6 opacity-90" />
          <h1 className="text-5xl font-bold mb-4">CVN&apos;EAT</h1>
          <h2 className="text-3xl font-semibold mb-2">Maintenance en cours</h2>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 text-left">
          <div className="flex items-start gap-4 justify-center">
            <FaTools className="w-8 h-8 shrink-0 mt-1 text-purple-200" />
            <p className="text-xl leading-relaxed text-center">{message}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/track-order"
            className="inline-flex items-center justify-center gap-2 bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
          >
            Suivre une commande
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
          >
            <FaLock className="w-4 h-4" />
            Connexion Admin / Partenaire / Livreur
          </Link>
        </div>

        <p className="text-xs text-purple-300 mt-8">
          Merci de votre compréhension — l&apos;équipe CVN&apos;EAT
        </p>
      </div>
    </div>
  );
}
