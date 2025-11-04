'use client';

import Link from 'next/link';
import { FaUtensils, FaClock, FaLock } from 'react-icons/fa';

export default function Maintenance() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800">
      <div className="max-w-2xl mx-auto px-4 text-center text-white">
        <div className="mb-8">
          <FaUtensils className="w-24 h-24 mx-auto mb-6 animate-pulse" />
          <h1 className="text-5xl font-bold mb-4">CVN'EAT</h1>
          <h2 className="text-3xl font-semibold mb-6">Site en construction</h2>
        </div>
        
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8">
          <p className="text-xl mb-4">
            Nous travaillons dur pour vous offrir la meilleure expérience de livraison de repas.
          </p>
          <p className="text-lg text-purple-100">
            CVN'EAT sera bientôt disponible !
          </p>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-purple-200">
          <FaClock className="w-5 h-5" />
          <span>Ouverture prévue très prochainement</span>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-sm text-purple-200 mb-4">
            Vous êtes restaurateur et souhaitez rejoindre CVN'EAT ?
          </p>
          <Link 
            href="/partner"
            className="inline-flex items-center gap-2 bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
          >
            <FaLock className="w-4 h-4" />
            Accès Partenaire
          </Link>
        </div>
      </div>
    </div>
  );
}

