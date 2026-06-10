'use client';

import Link from 'next/link';
import { FaTrophy, FaArrowRight } from 'react-icons/fa';
import { FaFutbol } from 'react-icons/fa';

export default function WorldCupGlobalBanner() {
  return (
    <Link
      href="/coupe-du-monde"
      className="wc-global-banner group block relative overflow-hidden"
    >
      <div className="wc-global-banner__bg" />
      <div className="wc-global-banner__shine" />

      <div className="relative z-10 flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          <div className="wc-global-banner__ball shrink-0 hidden sm:flex items-center justify-center w-9 h-9 text-amber-300 text-2xl">
            <FaFutbol aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-amber-200/90">
              Mode Coupe du Monde activé
            </p>
            <p className="text-sm sm:text-base font-black text-white truncate">
              <FaTrophy className="inline text-amber-400 mr-1.5 -mt-0.5" />
              Gagne TV, maillot officiel &amp; ballon CDM
            </p>
          </div>
        </div>

        <span className="shrink-0 flex items-center gap-1.5 bg-amber-400 text-emerald-950 text-xs sm:text-sm font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-lg group-hover:scale-105 transition-transform">
          Je participe
          <FaArrowRight className="text-[10px] sm:text-xs group-hover:translate-x-0.5 transition-transform" />
        </span>
      </div>
    </Link>
  );
}
