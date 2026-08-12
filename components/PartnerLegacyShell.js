'use client';

import { useEffect, useState } from 'react';
import PartnerImportantInfoOverlay from '@/components/PartnerImportantInfoOverlay';

/**
 * Shell partenaire compatible Android 7.1 :
 * - failsafe si React charge mais reste bloqué
 * - lien login HTML si JS plante
 */
export default function PartnerLegacyShell({ children }) {
  const [bootStuck, setBootStuck] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setBootStuck(true), 12000);
    return () => clearTimeout(t);
  }, []);

  return (
    <PartnerImportantInfoOverlay>
      {bootStuck && (
        <div className="fixed bottom-4 left-4 right-4 z-[9998] md:hidden">
          <div className="bg-zinc-900/95 text-white text-sm rounded-xl px-4 py-3 shadow-lg border border-zinc-700 flex flex-wrap items-center gap-3">
            <span>Chargement lent ?</span>
            <a
              href="/partner"
              className="px-3 py-1.5 rounded-lg bg-orange-600 text-white font-semibold no-underline"
            >
              Recharger
            </a>
            <a href="/login" className="px-3 py-1.5 rounded-lg bg-zinc-700 text-white font-semibold no-underline">
              Connexion
            </a>
          </div>
        </div>
      )}
      {children}
    </PartnerImportantInfoOverlay>
  );
}
