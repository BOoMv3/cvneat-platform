'use client';

import Link from 'next/link';
import { FaTrophy, FaFutbol, FaTv, FaTshirt } from 'react-icons/fa';
import { WORLD_CUP_PRIZES } from '@/lib/world-cup-campaign';
import CvneatLogo from './CvneatLogo';

export default function WorldCupHomeHero() {
  return (
    <section className="wc-home-hero relative overflow-hidden">
      <div className="wc-home-hero__bg" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-10 md:py-14">
        <div className="flex items-center justify-between gap-3 mb-8 sm:mb-10">
          <CvneatLogo size="lg" />
          <Link
            href="/coupe-du-monde"
            className="wc-cta-primary text-sm sm:text-base !py-2.5 !px-4 sm:!px-5"
          >
            <FaTrophy />
            Concours
          </Link>
        </div>

        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <span className="wc-badge inline-flex items-center gap-2 mb-4">
              <FaFutbol className="text-amber-300" />
              Mode Coupe du Monde
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-4">
              Commandez.
              <br />
              <span className="text-amber-300">Gagnez le gros lot.</span>
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-xl mx-auto lg:mx-0 mb-6">
              TV 55&quot;, maillot officiel, ballon de la Coupe du Monde… Chaque commande validée
              = 1 ticket unique.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link href="/coupe-du-monde" className="wc-cta-primary">
                <FaTrophy />
                Voir le concours
              </Link>
              <Link href="#liste-restaurants" className="wc-cta-secondary">
                Commander maintenant
              </Link>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md lg:max-w-lg">
            <div className="wc-prizes-showcase grid grid-cols-2 gap-3 sm:gap-4">
              {WORLD_CUP_PRIZES.slice(0, 4).map((prize) => (
                <div key={prize.id} className="wc-prize-card">
                  <div className="wc-prize-card__icon">
                    {prize.id === 'tv' && <FaTv />}
                    {prize.id === 'maillot' && <FaTshirt />}
                    {prize.id === 'ballon' && <FaFutbol />}
                    {prize.id === 'bons' && <span className="text-2xl">{prize.emoji}</span>}
                  </div>
                  <p className="font-bold text-white text-sm sm:text-base leading-tight">
                    {prize.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-200/70 mt-0.5">{prize.subtitle}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
