'use client';

import Link from 'next/link';
import Image from 'next/image';
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
import {
  WORLD_CUP_BALL_SRC,
  WORLD_CUP_PRIZES,
  WORLD_CUP_RULES,
  WORLD_CUP_START,
  WORLD_CUP_END,
} from '@/lib/world-cup-campaign';
import WorldCupPrizeImage from '@/components/WorldCupPrizeImage';

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
        <Image
          src="/world-cup/world-cup-hero.png"
          alt=""
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="wc-page-hero__overlay" />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-200 hover:text-white text-sm mb-8 transition-colors"
          >
            <FaArrowLeft />
            Retour à CVN&apos;EAT
          </Link>

          <div className="flex flex-col lg:flex-row items-center gap-10">
            <div className="flex-1 text-center lg:text-left">
              <p className="wc-badge mb-5 mx-auto lg:mx-0 w-fit">
                <FaCalendarAlt className="inline mr-2" />
                Du {formatDate(WORLD_CUP_START)} au {formatDate(WORLD_CUP_END)}
              </p>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-5">
                Grand jeu
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-yellow-400">
                  Coupe du Monde
                </span>
              </h1>
              <p className="text-lg sm:text-xl text-emerald-100/90 max-w-2xl mb-8">
                CVN&apos;EAT passe en mode fête du foot ! Commandez pendant la compétition et
                tentez de gagner des lots de ouf : TV, maillot officiel, ballon de la Coupe du
                Monde et bien plus.
              </p>
              <Link href="/" className="wc-cta-primary text-lg px-8 py-4">
                <FaTicketAlt />
                Commander = 1 ticket
              </Link>
            </div>

            <div className="shrink-0 relative">
              <div className="absolute inset-0 bg-amber-400/20 blur-3xl rounded-full scale-150" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/world-cup/world-cup-trophy.png"
                alt="Trophée Coupe du Monde"
                width={280}
                height={280}
                className="relative w-48 sm:w-64 md:w-72 h-auto drop-shadow-2xl wc-trophy-float wc-png-nobg"
                draggable={false}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
        <h2 className="text-2xl sm:text-3xl font-black text-center mb-3 flex items-center justify-center gap-3">
          <FaTrophy className="text-amber-400" />
          Les lots à gagner
        </h2>
        <p className="text-center text-emerald-200/80 mb-10 max-w-xl mx-auto">
          Des prix premium pour célébrer chaque but comme il se doit.
        </p>

        <div className="grid sm:grid-cols-2 gap-5 sm:gap-6 mb-8">
          {WORLD_CUP_PRIZES.map((prize, index) => {
            const Icon = PRIZE_ICONS[prize.id] || FaGift;
            const isGrand = prize.tier === 'grand';
            return (
              <div
                key={prize.id}
                className={`${isGrand ? 'sm:col-span-2 wc-grand-prize' : 'wc-prize-card'} flex flex-col sm:flex-row items-center gap-5 p-6 sm:p-8`}
              >
                <div
                  className={`shrink-0 flex items-center justify-center bg-white/5 rounded-2xl p-3 ${isGrand ? 'w-full sm:w-52 h-44 sm:h-48' : 'w-28 h-28 sm:w-32 sm:h-32'}`}
                >
                  <WorldCupPrizeImage
                    src={prize.image}
                    alt={prize.title}
                    className="w-full h-full object-contain rounded-xl"
                  />
                </div>
                <div className={`text-center sm:text-left ${isGrand ? 'flex-1' : ''}`}>
                  <div className="text-amber-400 text-2xl mb-2">
                    <Icon className="inline" />
                  </div>
                  <h3 className={`font-black text-white ${isGrand ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>
                    {prize.title}
                    {isGrand && (
                      <span className="ml-2 text-xs bg-amber-400 text-emerald-950 px-2 py-0.5 rounded-full align-middle">
                        GRAND PRIX
                      </span>
                    )}
                  </h3>
                  <p className="text-emerald-200/80 mt-1">{prize.subtitle}</p>
                  {index === 0 && (
                    <p className="text-amber-200/90 text-sm mt-3 font-semibold">
                      Le rêve : regarder la finale sur grand écran chez toi.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-center mb-16">
          <WorldCupPrizeImage
            src={WORLD_CUP_BALL_SRC}
            alt="Ballon officiel"
            className="w-32 sm:w-40 h-auto animate-spin mx-auto"
            style={{ animationDuration: '8s' }}
          />
        </div>
      </section>

      <section className="bg-emerald-950/80 border-y border-amber-500/20 py-14 sm:py-16">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-black text-center mb-8">Comment participer ?</h2>
          <ol className="space-y-4">
            {[
              'Commande sur CVN\'EAT pendant la Coupe du Monde (min. 15€).',
              'Chaque commande validée te donne 1 ticket automatique.',
              'Plus tu commandes, plus tu multiplies tes chances.',
              'Tirage au sort le 20 juillet — les gagnants sont contactés par e-mail.',
            ].map((step, i) => (
              <li
                key={i}
                className="flex items-start gap-4 bg-white/5 rounded-xl p-4 border border-white/10"
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
