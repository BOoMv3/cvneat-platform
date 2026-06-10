'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaTrophy, FaFutbol } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';
import WorldCupTicketBadge from './WorldCupTicketBadge';

export default function WorldCupTicketsPanel() {
  const [tickets, setTickets] = useState([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    fetch('/api/world-cup-status')
      .then((r) => (r.ok ? r.json() : { enabled: false }))
      .then((d) => setEnabled(!!d.enabled))
      .catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;
        const r = await fetch('/api/world-cup/my-tickets', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const d = r.ok ? await r.json() : { tickets: [] };
        setTickets(Array.isArray(d.tickets) ? d.tickets : []);
      } catch {
        setTickets([]);
      }
    })();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div className="mb-6 rounded-2xl overflow-hidden shadow-lg">
      <div className="bg-gradient-to-r from-emerald-800 via-green-800 to-emerald-900 px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-amber-300 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
              <FaFutbol />
              Mode Coupe du Monde
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white flex items-center gap-2 mt-1">
              <FaTrophy className="text-amber-400" />
              Mes tickets tirage
            </h2>
          </div>
          <Link
            href="/coupe-du-monde"
            className="text-xs sm:text-sm font-bold text-emerald-950 bg-amber-400 px-3 py-2 rounded-full hover:bg-amber-300 transition-colors"
          >
            Voir les lots
          </Link>
        </div>
        <p className="text-emerald-100/90 text-sm mt-2">
          {tickets.length > 0
            ? `${tickets.length} ticket${tickets.length > 1 ? 's' : ''} actif${tickets.length > 1 ? 's' : ''} — 1 commande = 1 code unique`
            : 'Commande dès 15€ pour recevoir ton premier ticket'}
        </p>
      </div>

      {tickets.length > 0 ? (
        <div className="bg-emerald-950/90 p-4 sm:p-5 grid gap-2 sm:grid-cols-2">
          {tickets.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-2 bg-white/5 rounded-lg px-3 py-2.5"
            >
              <WorldCupTicketBadge code={t.code} compact />
              <span className="text-[10px] text-emerald-300/70 shrink-0">
                #{String(t.orderId || '').slice(0, 8)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-emerald-950/80 px-4 py-5 text-center text-emerald-200/80 text-sm">
          Aucun ticket pour l&apos;instant — passe commande pendant la CDM !
        </div>
      )}
    </div>
  );
}
