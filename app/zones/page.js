'use client';

import Link from 'next/link';
import { FaArrowLeft, FaMapMarkerAlt } from 'react-icons/fa';

const ZONES = [
  {
    title: 'Ganges & alentours',
    towns: ['Ganges', 'Laroque', 'Cazilhac', 'Moulès-et-Baucels'],
  },
  {
    title: 'Vallée & villages',
    towns: [
      'Saint-Bauzille-de-Putois',
      'Sumène',
      'Agonès',
      'Gorniès',
      'Saint-Julien-de-la-Nef',
      'Saint-Laurent-le-Minier',
      'Saint-Martial',
      'Saint-Roman-de-Codières',
      'Roquedur',
      'Brissac',
    ],
  },
  {
    title: 'Vers Saint-Hippolyte',
    towns: ['Saint-Hippolyte-du-Fort'],
  },
  {
    title: 'Vers Le Vigan',
    towns: ['Le Vigan', 'Avèze', 'Bréau-et-Salagosse'],
  },
];

export default function ZonesPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-orange-50/70 via-white to-white">
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <Link
          href="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-orange-600"
        >
          <FaArrowLeft className="h-3.5 w-3.5" />
          Retour
        </Link>

        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-orange-600">
          Zones de livraison
        </p>
        <h1 className="text-3xl font-black tracking-tight text-gray-900 sm:text-4xl">
          Où mange-t-on aujourd&apos;hui ?
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">
          Choisissez votre zone pour découvrir les restaurants disponibles et commander en quelques
          clics.
        </p>

        <nav className="mt-10 grid gap-4 sm:grid-cols-2" aria-label="Zones de livraison">
          {ZONES.map((zone) => (
            <Link
              key={zone.title}
              href="/"
              className="group rounded-2xl border border-orange-100 bg-white p-5 shadow-sm transition hover:border-orange-300 hover:shadow-md"
            >
              <div className="mb-3 flex items-start gap-3">
                <span className="mt-0.5 rounded-lg bg-orange-50 p-2 text-orange-600">
                  <FaMapMarkerAlt className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 group-hover:text-orange-600">
                    {zone.title}
                  </h2>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    {zone.towns.join(', ')}
                  </p>
                </div>
              </div>
              <span className="text-sm font-semibold text-orange-600">Voir les restaurants →</span>
            </Link>
          ))}
        </nav>

        <div className="mt-12 flex flex-wrap gap-4 text-sm">
          <Link href="/devenir-partenaire" className="font-semibold text-orange-600 hover:underline">
            Devenir restaurant partenaire
          </Link>
          <Link href="/" className="font-semibold text-gray-600 hover:text-orange-600">
            Accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
