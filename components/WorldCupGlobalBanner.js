'use client';

import Link from 'next/link';
import { FaTrophy, FaArrowRight, FaFutbol } from 'react-icons/fa';

export default function WorldCupGlobalBanner() {
  return (
    <Link href="/coupe-du-monde" className="wc-global-banner group block">
      <div className="flex items-center justify-between gap-3 px-3 sm:px-5 py-2.5 sm:py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <span className="wc-global-banner__icon shrink-0">
            <FaFutbol />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-emerald-200/80">
              Coupe du Monde 2026
            </p>
            <p className="text-sm sm:text-base font-bold text-white truncate">
              <FaTrophy className="inline text-amber-300 mr-1.5 -mt-0.5" />
              Gagne TV, maillot officiel &amp; ballon
            </p>
          </div>
        </div>

        <span className="shrink-0 flex items-center gap-1.5 bg-amber-400 text-emerald-950 text-xs sm:text-sm font-bold px-3 sm:px-4 py-1.5 sm:py-2 rounded-full group-hover:bg-amber-300 transition-colors">
          Je participe
          <FaArrowRight className="text-[10px] sm:text-xs" />
        </span>
      </div>
    </Link>
  );
}
