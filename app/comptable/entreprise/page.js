'use client';

const ISSUER = {
  name: "CVN'EAT (SAS)",
  siret: '989 966 700 00019',
  rcs: 'RCS Montpellier 989 966 700',
  address: '1 bis Rue Armand Sabatier, 34190 Ganges, France',
  email: 'contact@cvneat.fr',
  tvaNote: 'Mention actuelle sur les factures : exonération TVA art. 293 B du CGI (à valider avec votre expert-comptable).',
};

export default function ComptableEntreprisePage() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">CVN&apos;EAT — client sur les relevés partenaires</h1>
        <p className="text-slate-600 mt-1">
          Coordonnées CVN&apos;EAT affichées comme client / destinataire sur les relevés de ventes émis par les restaurants.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">Raison sociale</p>
          <p className="text-lg font-semibold text-slate-900">{ISSUER.name}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs uppercase text-slate-500 font-medium">SIRET</p>
            <p className="font-mono">{ISSUER.siret}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500 font-medium">RCS</p>
            <p>{ISSUER.rcs}</p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">Adresse</p>
          <p>{ISSUER.address}</p>
        </div>
        <div>
          <p className="text-xs uppercase text-slate-500 font-medium">Email</p>
          <p>{ISSUER.email}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-900">
          {ISSUER.tvaNote}
        </div>
      </div>

      <div className="bg-slate-100 rounded-xl p-5 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Rappels comptables</p>
        <ul className="mt-2 list-disc list-inside space-y-1">
          <li>Chaque virement restaurant génère un relevé PDF (restaurant émetteur, CVN&apos;EAT client — commission + net par commande).</li>
          <li>Les virements livreurs disposent d&apos;une facture HTML détaillant les courses payées.</li>
          <li>Les exports CSV sont disponibles sur chaque section pour votre logiciel comptable.</li>
          <li>Les montants Stripe (Payment Intent) sont visibles dans l&apos;export des commandes.</li>
        </ul>
      </div>
    </div>
  );
}
