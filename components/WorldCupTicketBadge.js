'use client';

import { FaTicketAlt, FaCopy } from 'react-icons/fa';
import { useState } from 'react';

export default function WorldCupTicketBadge({ code, compact = false, className = '' }) {
  const [copied, setCopied] = useState(false);

  if (!code) return null;

  const copy = async (e) => {
    e?.stopPropagation?.();
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 bg-gradient-to-r from-emerald-600 to-green-700 text-amber-100 text-xs font-black px-2.5 py-1 rounded-full border border-amber-400/40 ${className}`}
        onClick={copy}
        role="button"
        tabIndex={0}
      >
        <FaTicketAlt className="text-amber-300" />
        {code}
      </span>
    );
  }

  return (
    <div
      className={`rounded-xl border-2 border-amber-400/50 bg-gradient-to-br from-emerald-800 via-green-900 to-emerald-950 p-4 shadow-lg ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
        <FaTicketAlt />
        Ticket Coupe du Monde
      </div>
      <p className="text-2xl sm:text-3xl font-black text-white tracking-widest font-mono mb-2">
        {code}
      </p>
      <p className="text-emerald-200/80 text-xs mb-3">
        Conserve ce code — il participe au tirage au sort (TV, maillot, ballon officiel…).
      </p>
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-white transition-colors"
      >
        <FaCopy />
        {copied ? 'Copié !' : 'Copier le code'}
      </button>
    </div>
  );
}
