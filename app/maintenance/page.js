'use client';

import Link from 'next/link';
import { FaUtensils, FaClock, FaLock } from 'react-icons/fa';
import { useEffect, useMemo, useState } from 'react';

const createCountdown = () => {
  const now = new Date();
  const target = new Date();
  target.setHours(17, 0, 0, 0);

  // Si on a dépassé 17h, viser le lendemain à 17h
  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  const diff = target.getTime() - now.getTime();

  if (diff <= 0) {
    return { hours: '00', minutes: '00', seconds: '00' };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');

  return { hours, minutes, seconds };
};

export default function Maintenance() {
  const [countdown, setCountdown] = useState(createCountdown);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(createCountdown());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const targetLabel = useMemo(() => {
    const target = new Date();
    target.setHours(17, 0, 0, 0);
    if (new Date() > target) {
      target.setDate(target.getDate() + 1);
    }
    return target.toLocaleDateString('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [countdown.hours]);

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
          <div className="mt-6">
            <p className="text-sm uppercase tracking-widest text-purple-200 mb-3">Réouverture prévue aujourd'hui à 17h</p>
            <div className="flex items-center justify-center gap-3 sm:gap-4">
              {['Heures', 'Minutes', 'Secondes'].map((label, index) => {
                const value = index === 0 ? countdown.hours : index === 1 ? countdown.minutes : countdown.seconds;
                return (
                  <div key={label} className="bg-white/15 rounded-xl px-4 sm:px-6 py-3 shadow-lg border border-white/10">
                    <div className="text-3xl sm:text-4xl font-bold text-white tabular-nums">{value}</div>
                    <div className="text-xs uppercase tracking-wide text-purple-200 mt-1">{label}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-purple-200 mt-4 italic">(Prochaine ouverture : {targetLabel})</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-4 text-sm text-purple-200">
          <FaClock className="w-5 h-5" />
          <span>Ouverture prévue très prochainement</span>
        </div>

        <div className="mt-12 pt-8 border-t border-white/20">
          <p className="text-sm text-purple-200 mb-4">
            Vous êtes restaurateur et souhaitez rejoindre CVN'EAT ?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/restaurant-request"
              className="inline-flex items-center gap-2 bg-white text-purple-700 px-6 py-3 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              <FaUtensils className="w-4 h-4" />
              Devenir Partenaire
            </Link>
            <Link 
              href="/login"
              className="inline-flex items-center gap-2 bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 transition-colors"
            >
              <FaLock className="w-4 h-4" />
              Connexion Partenaire / Admin
            </Link>
          </div>
          <p className="text-xs text-purple-300 mt-4">
            Les inscriptions clients sont temporairement fermées. Le site ouvrira bientôt !
          </p>
        </div>
      </div>
    </div>
  );
}

