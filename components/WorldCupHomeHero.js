'use client';

import Link from 'next/link';
import Image from 'next/image';
import { FaTrophy, FaFutbol, FaTv, FaTshirt } from 'react-icons/fa';
import { WORLD_CUP_PRIZES } from '@/lib/world-cup-campaign';
import CvneatLogo from './CvneatLogo';

export default function WorldCupHomeHero() {
  return (
    <section className="wc-home-hero relative overflow-hidden">
      <Image
        src="/world-cup/world-cup-hero.png"
        alt="Coupe du Monde 2026"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="wc-home-hero__overlay absolute inset-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-6 sm:py-10 md:py-14">
        <div className="mb-6 sm:mb-8">
          <CvneatLogo size="lg" />
        </div>
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          <div className="flex-1 text-center lg:text-left">
            <span className="wc-badge inline-flex items-center gap-2 mb-4">
              <FaFutbol className="text-amber-300" />
              Coupe du Monde 2026 — CVN&apos;EAT
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white leading-tight mb-4 drop-shadow-2xl">
              Commandez.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
                Gagnez le gros lot.
              </span>
            </h2>
            <p className="text-base sm:text-lg text-emerald-100/90 max-w-xl mx-auto lg:mx-0 mb-6">
              TV 55&quot;, maillot officiel, ballon de la Coupe du Monde… Chaque commande = 1
              ticket. Le site est en mode fête du foot !
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
                  <p className="font-black text-white text-sm sm:text-base leading-tight">
                    {prize.title}
                  </p>
                  <p className="text-[10px] sm:text-xs text-emerald-200/80 mt-0.5">{prize.subtitle}</p>
                </div>
              ))}
            </div>
            <div className="wc-trophy-float mt-4 flex justify-center">
              <Image
                src="/world-cup/world-cup-trophy.png"
                alt="Trophée"
                width={120}
                height={120}
                className="w-24 sm:w-28 h-auto drop-shadow-2xl wc-png-nobg"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
