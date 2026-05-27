'use client';

import { useCallback, useEffect, useState } from 'react';
import PartnerImportantInfoContent, { PartnerImportantInfoTitle } from '@/components/PartnerImportantInfoContent';
import {
  acknowledgePartnerImportantInfo,
  hasAcknowledgedPartnerImportantInfo,
} from '@/lib/partner-important-info';

/**
 * Modale obligatoire (jusqu’à validation) + bandeau fixe sur tout l’espace partenaire.
 */
export default function PartnerImportantInfoOverlay({ children }) {
  const [clientReady, setClientReady] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const ack = hasAcknowledgedPartnerImportantInfo();
    setAcknowledged(ack);
    setShowModal(!ack);
    setClientReady(true);
  }, []);

  const handleAcknowledge = useCallback(() => {
    if (!checked) return;
    acknowledgePartnerImportantInfo();
    setAcknowledged(true);
    setShowModal(false);
  }, [checked]);

  const openModal = useCallback(() => {
    setChecked(acknowledged);
    setShowModal(true);
  }, [acknowledged]);

  const mustBlockUi = !clientReady || (!acknowledged && showModal);

  return (
    <>
      {!clientReady && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 text-white text-sm font-medium px-6">
          Chargement de l&apos;espace partenaire…
        </div>
      )}

      {clientReady && (
        <>
      {/* Bandeau toujours visible */}
      <div
        className={`sticky top-0 z-[45] border-b-2 shadow-md ${
          acknowledged
            ? 'bg-orange-100 dark:bg-orange-950/80 border-orange-400'
            : 'bg-red-600 border-red-800 animate-pulse'
        }`}
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p
            className={`text-sm font-bold leading-snug ${
              acknowledged ? 'text-orange-950 dark:text-orange-100' : 'text-white'
            }`}
          >
            {acknowledged ? (
              <>
                Rappel CVN&apos;EAT : commission <strong>20&nbsp;%</strong> · promos à notre charge · app native en
                cours · tablette = usage CVN&apos;EAT uniquement
              </>
            ) : (
              <>
                ⚠️ MESSAGE IMPORTANT — vous devez le lire avant de continuer (commission, promos, tablettes)
              </>
            )}
          </p>
          <button
            type="button"
            onClick={openModal}
            className={`shrink-0 px-4 py-2 rounded-lg text-sm font-bold shadow ${
              acknowledged
                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                : 'bg-white text-red-700 hover:bg-red-50'
            }`}
          >
            {acknowledged ? 'Relire le message' : 'Lire maintenant'}
          </button>
        </div>
      </div>

      {/* Modale bloquante tant que non validée */}
      {showModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-3 py-6">
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-4 border-orange-500"
            role="dialog"
            aria-modal="true"
            aria-labelledby="partner-important-info-title"
          >
            <div className="p-5 sm:p-6 border-b dark:border-gray-700 shrink-0">
              <PartnerImportantInfoTitle />
              <p id="partner-important-info-title" className="sr-only">
                Informations importantes pour les partenaires CVN&apos;EAT
              </p>
              {!acknowledged && (
                <p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">
                  Merci de lire ce message en entier, puis de confirmer ci-dessous. Il reste accessible via le bandeau
                  orange en haut de l&apos;écran.
                </p>
              )}
            </div>

            <div className="p-5 sm:p-6 overflow-y-auto flex-1">
              <PartnerImportantInfoContent />
            </div>

            <div className="p-5 sm:p-6 border-t dark:border-gray-700 shrink-0 space-y-3 bg-gray-50 dark:bg-gray-800/80 rounded-b-2xl">
              {!acknowledged ? (
                <>
                  <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setChecked(e.target.checked)}
                      className="mt-1 h-5 w-5 rounded border-gray-400 text-orange-600 focus:ring-orange-500"
                    />
                    <span>
                      J&apos;ai lu ce message et je m&apos;engage à utiliser la tablette CVN&apos;EAT uniquement pour
                      les commandes (pas Facebook, Leboncoin, YouTube, etc.).
                    </span>
                  </label>
                  <button
                    type="button"
                    disabled={!checked}
                    onClick={handleAcknowledge}
                    className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    J&apos;ai lu et compris — continuer
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
        </>
      )}

      <div className={mustBlockUi ? 'pointer-events-none select-none' : undefined}>{children}</div>
    </>
  );
}
