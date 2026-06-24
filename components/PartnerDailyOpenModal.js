'use client';

import { getTodayFirstOpeningLabel } from '@/lib/restaurant-daily-open';

export default function PartnerDailyOpenModal({
  restaurant,
  open,
  loading,
  onConfirm,
  onDecline,
  onLater,
}) {
  if (!open || !restaurant) return null;

  const openingLabel = getTodayFirstOpeningLabel(restaurant.horaires);
  const restaurantName = restaurant.nom || 'votre restaurant';

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/65 backdrop-blur-sm">
      <div
        className="relative max-w-lg w-full bg-white dark:bg-gray-800 border-2 border-green-500 rounded-2xl shadow-2xl p-6"
        role="dialog"
        aria-modal="true"
        aria-labelledby="daily-open-title"
      >
        <div className="flex items-start gap-4">
          <span className="text-4xl flex-shrink-0" role="img" aria-hidden>🍽️</span>
          <div>
            <h2 id="daily-open-title" className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Êtes-vous ouvert aujourd&apos;hui ?
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-3">
              Bonjour ! Pour que <strong>{restaurantName}</strong> apparaisse ouvert sur CVN&apos;EAT,
              confirmez votre ouverture chaque jour lorsque vous démarrez le service.
            </p>
            {openingLabel && (
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                Horaire d&apos;ouverture prévu aujourd&apos;hui : <strong>{openingLabel}</strong>.
                Sans confirmation, vous restez fermé aux yeux des clients.
              </p>
            )}
            <p className="text-gray-500 dark:text-gray-500 text-xs">
              Vos horaires habituels s&apos;appliquent ensuite : vous serez visible uniquement pendant vos plages de service.
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold rounded-xl transition-colors"
          >
            {loading ? 'Enregistrement…' : 'Oui, je suis ouvert'}
          </button>
          <button
            type="button"
            onClick={onDecline}
            disabled={loading}
            className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
          >
            Non, fermé aujourd&apos;hui
          </button>
          <button
            type="button"
            onClick={onLater}
            disabled={loading}
            className="w-full py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
