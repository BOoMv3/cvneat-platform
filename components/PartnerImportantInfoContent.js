'use client';

import { FaChartLine, FaInstagram } from 'react-icons/fa';

/** Contenu du message partenaires (modal + page). */
export default function PartnerImportantInfoContent({ compact = false }) {
  const sectionClass = compact
    ? 'bg-white/80 dark:bg-gray-900/50 rounded-lg p-3 border'
    : 'bg-white/80 dark:bg-gray-900/50 rounded-lg p-4 border';

  return (
    <div
      className={`${compact ? 'space-y-3' : 'space-y-4'} text-sm text-gray-800 dark:text-gray-200`}
    >
      <div className={`${sectionClass} border-orange-200 dark:border-orange-800`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Commission & concurrence</h3>
        <p>
          Certains d&apos;entre vous ont signé avec un concurrent qui prélève environ{' '}
          <strong>36&nbsp;% TTC</strong>. Chez CVN&apos;EAT, la commission est de <strong>20&nbsp;%</strong>.
        </p>
        <p className="mt-2">
          <strong className="text-emerald-700 dark:text-emerald-300">
            Nouveau: en retrait sur place, la commission baisse à 15&nbsp;%.
          </strong>
        </p>
        <p className="mt-2">
          Les promos du concurrent sont pour l&apos;instant à leur charge ; les prochaines seront souvent{' '}
          <strong>à votre charge</strong>. Chez nous, <strong>toutes les promos sont à la charge de CVN&apos;EAT</strong>.
        </p>
      </div>

      <div className={`${sectionClass} border-blue-200 dark:border-blue-800`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <FaInstagram className="text-pink-600 shrink-0" />
          Réseaux sociaux
        </h3>
        <p>
          Nous avons pris une <strong>community manager</strong> qui va passer bientôt dans chaque restaurant
          partenaire (photos, vidéos, réseaux sociaux) pour booster votre visibilité locale.
        </p>
      </div>

      <div className={`${sectionClass} border-indigo-200 dark:border-indigo-800`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Application native</h3>
        <p>
          Application <strong>100&nbsp;% native</strong> en développement : plus rapide, plus stable, moins de latence
          qu&apos;en navigateur sur tablette.
        </p>
      </div>

      <div className={`${sectionClass} border-amber-300 dark:border-amber-700`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Tablettes CVN&apos;EAT</h3>
        <p>
          Tablettes <strong>neuves</strong>, réservées à <strong>CVN&apos;EAT uniquement</strong>. Facebook, Leboncoin,
          YouTube, etc. ralentissent l&apos;appareil — merci d&apos;éviter.
        </p>
        <p className="mt-2 text-amber-900 dark:text-amber-200 font-medium">
          Contact : <a href="tel:0786014171" className="underline">07&nbsp;86&nbsp;01&nbsp;41&nbsp;71</a>
          {' · '}
          <a href="mailto:contact@cvneat.fr" className="underline">contact@cvneat.fr</a>
        </p>
      </div>

      <div className={`${sectionClass} border-emerald-300 dark:border-emerald-700`}>
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Nouveau: retrait sur place (mis en avant)</h3>
        <p>
          Le client peut maintenant choisir <strong>livraison</strong> ou <strong>retrait sur place</strong> au checkout.
          En retrait sur place: <strong>0&nbsp;€ de frais de livraison pour le client</strong> et{' '}
          <strong>commission réduite à 15&nbsp;%</strong> pour le restaurant.
        </p>
      </div>
    </div>
  );
}

export function PartnerImportantInfoTitle() {
  return (
    <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
      <FaChartLine className="text-orange-600 dark:text-orange-400 shrink-0" />
      Message important — à lire
    </h2>
  );
}
