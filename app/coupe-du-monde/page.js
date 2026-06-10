'use client';

import Link from 'next/link';
import {
  FaTrophy,
  FaFutbol,
  FaTv,
  FaTshirt,
  FaGift,
  FaArrowLeft,
  FaTicketAlt,
  FaCalendarAlt,
} from 'react-icons/fa';
import { WORLD_CUP_PRIZES, WORLD_CUP_RULES, WORLD_CUP_START, WORLD_CUP_END } from '@/lib/world-cup-campaign';
import CvneatLogo from '@/components/CvneatLogo';

const formatDate = (d) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

const PRIZE_ICONS = {
  tv: FaTv,
  maillot: FaTshirt,
  ballon: FaFutbol,
  bons: FaGift,
};

export default function CoupeDuMondePage() {
  return (
    <div className="wc-page">
      <section className="wc-page-hero relative overflow-hidden">
        <div className="wc-home-hero__bg absolute inset-0" />
        <div className="wc-page-hero__overlay" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-12 sm:py-20">
          <div className="flex items-center justify-between gap-4 mb-10">
            <CvneatLogo size="lg" href="/" />
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-emerald-200 hover:text-white text-sm transition-colors"
            >
              <FaArrowLeft />
              Accueil
            </Link>
          </div>

          <div className="max-w-3xl">
            <p className="wc-badge mb-5 w-fit">
              <FaCalendarAlt className="inline mr-2" />
              Du {formatDate(WORLD_CUP_START)} au {formatDate(WORLD_CUP_END)}
            </p>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-5">
              Grand jeu
              <br />
              <span className="text-amber-300">Coupe du Monde</span>
            </h1>
            <p className="text-lg sm:text-xl text-emerald-100/90 max-w-2xl mb-8">
              Commandez pendant la compétition et tentez de gagner TV, maillot officiel, ballon
              et bons d&apos;achat CVN&apos;EAT.
            </p>
            <Link href="/" className="wc-cta-primary text-lg px-8 py-4">
              <FaTicketAlt />
              Commander = 1 ticket
            </Link>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 flex items-center justify-center gap-3">
          <FaTrophy className="text-amber-400" />
          Les lots à gagner
        </h2>
        <p className="text-center text-emerald-200/80 mb-10 max-w-xl mx-auto">
          Des prix premium pour célébrer chaque but.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-8">
          {WORLD_CUP_PRIZES.map((prize) => {
            const Icon = PRIZE_ICONS[prize.id] || FaGift;
            const isGrand = prize.tier === 'grand';
            return (
              <div
                key={prize.id}
                className={`${isGrand ? 'sm:col-span-2 wc-grand-prize' : 'wc-prize-card'} flex items-center gap-5 p-6 sm:p-8`}
              >
                <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-amber-300 text-2xl">
                  <Icon />
                </div>
                <div className="text-left flex-1">
                  <h3 className={`font-black text-white ${isGrand ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                    {prize.title}
                    {isGrand && (
                      <span className="ml-2 text-xs bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full align-middle font-bold">
                        GRAND PRIX
                      </span>
                    )}
                  </h3>
                  <p className="text-emerald-200/80 mt-1">{prize.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-emerald-950/60 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center mb-8">Comment participer ?</h2>
          <ol className="space-y-4">
            {[
              "Commande sur CVN'EAT pendant la Coupe du Monde (min. 15€).",
              'Chaque commande validée te donne 1 code unique.',
              'Plus tu commandes, plus tu multiplies tes chances.',
              'Tirage au sort le 20 juillet — les gagnants sont contactés par e-mail.',
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-4 bg-white/5 rounded-xl p-4"
              >
                <span className="shrink-0 w-8 h-8 rounded-full bg-amber-400 text-emerald-950 font-black flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="text-emerald-50 pt-1">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-14">
        <h2 className="text-xl font-bold text-amber-200 mb-4">Règlement</h2>
        <ul className="space-y-2 text-emerald-200/80 text-sm">
          {WORLD_CUP_RULES.map((rule) => (
            <li key={rule} className="flex gap-2">
              <span className="text-amber-400">•</span>
              {rule}
            </li>
          ))}
        </ul>
        <p className="text-xs text-emerald-300/50 mt-6">
          Jeu gratuit, sans obligation d&apos;achat au-delà de la commande minimum. CVN&apos;EAT se
          réserve le droit de modifier ou annuler le jeu en cas de force majeure.
        </p>

        <div className="mt-10 text-center">
          <Link href="/" className="wc-cta-primary text-base">
            <FaFutbol />
            C&apos;est parti — je commande !
          </Link>
        </div>
      </section>
    </div>
  );
}
