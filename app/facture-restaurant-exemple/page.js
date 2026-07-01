import Link from 'next/link';
import Image from 'next/image';

export const metadata = {
  title: "Facture restaurant d'exemple | CVN'EAT",
  description:
    "Document d'exemple pour présenter aux futurs partenaires et à leur comptable le format des factures CVN'EAT.",
};

export default function FactureRestaurantExemplePage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        <div className="flex items-center gap-4">
          <Image src="/cvneat-logo.png" alt="CVN'EAT" width={72} height={72} className="rounded-full" />
          <div>
            <h1 className="text-2xl font-bold">Facture restaurant — exemple</h1>
            <p className="text-slate-600 mt-1">
              Document fictif au même format que les factures réelles transmises après chaque virement.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm text-amber-950 leading-relaxed">
          <p className="font-semibold">À transmettre à un futur partenaire ou à son expert-comptable</p>
          <p className="mt-2">
            Les coordonnées du restaurant, les numéros de commande et les montants sont volontairement fictifs.
            Le document montre comment CVN&apos;EAT facture sa commission et détaille le net reversé au restaurant
            (CA articles, commission plateforme, montant viré).
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-lg">Télécharger ou imprimer</h2>
          <div className="flex flex-wrap gap-3">
            <a
              href="/api/facture-restaurant-exemple?format=html"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
            >
              Ouvrir la version HTML
            </a>
            <a
              href="/api/facture-restaurant-exemple?format=pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700"
            >
              Télécharger le PDF
            </a>
          </div>
          <p className="text-sm text-slate-500">
            Depuis la version HTML : boutons <strong>Télécharger</strong> ou <strong>Imprimer</strong> en haut à droite
            (impression → « Enregistrer en PDF »).
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-sm text-slate-700 space-y-2">
          <p className="font-semibold text-slate-900">Contenu du document d&apos;exemple</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Émetteur : CVN&apos;EAT (SAS) — SIRET, RCS, adresse Ganges</li>
            <li>Restaurant fictif : SARL Le Bistrot du Marché (SIRET d&apos;exemple)</li>
            <li>6 commandes sur mai 2026 — commission 20 % — total viré 146,88 €</li>
            <li>Mention TVA : exonération art. 293 B du CGI (comme sur les factures réelles)</li>
          </ul>
        </div>

        <p className="text-center text-sm text-slate-500">
          <Link href="/" className="text-orange-600 hover:underline">
            Retour à l&apos;accueil CVN&apos;EAT
          </Link>
        </p>
      </div>
    </div>
  );
}
