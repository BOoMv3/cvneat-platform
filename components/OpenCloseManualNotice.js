'use client';

import { useState, useEffect } from 'react';

const STORAGE_KEY = 'cvneat_openclose_manual_notice_seen';

export default function OpenCloseManualNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const seen = typeof window !== 'undefined' && sessionStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, []);

  const handleClose = () => {
    if (typeof window !== 'undefined') sessionStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative max-w-lg w-full bg-amber-50 dark:bg-amber-950/90 border-4 border-amber-500 rounded-2xl shadow-2xl p-6 animate-[pulse_2s_ease-in-out_infinite]">
        <div className="flex items-start gap-4">
          <span className="text-4xl flex-shrink-0" role="img" aria-hidden>⚠️</span>
          <div>
            <h2 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-2">
              Important — Ouverture / Fermeture manuelle
            </h2>
            <p className="text-amber-800 dark:text-amber-200 text-sm leading-relaxed mb-4">
              Suite à une mise à jour, un bug nous empêche encore d’utiliser correctement les plages horaires.
              <strong className="block mt-2">En attendant la correction, vous devez gérer l’ouverture et la fermeture manuellement :</strong>
            </p>
            <ul className="text-amber-800 dark:text-amber-200 text-sm list-disc list-inside space-y-1 mb-4">
              <li>Cliquez sur <strong>« Ouvrir »</strong> quand vous ouvrez votre restaurant.</li>
              <li>Cliquez sur <strong>« Fermer »</strong> à la fin de votre service.</li>
            </ul>
            <p className="text-amber-700 dark:text-amber-300 text-xs">
              Les clients verront bien sur CVN’Eat si vous êtes ouvert ou fermé. Merci de votre compréhension.
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="mt-6 w-full py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-colors"
        >
          J’ai compris
        </button>
      </div>
    </div>
  );
}
