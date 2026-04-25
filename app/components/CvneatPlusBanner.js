/* eslint-disable @next/next/no-img-element */
'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { CVNEAT_PLUS_NAME, CVNEAT_PLUS_MIN_ORDER_EUR } from '@/lib/cvneat-plus';
import { FaStar, FaTimes, FaTruck } from 'react-icons/fa';

const DISMISS_KEY = 'cvneat_plus_banner_dismissed_v2';

export default function CvneatPlusBanner() {
  const pathname = usePathname() || '';
  const [dismissed, setDismissed] = useState(true);
  const [active, setActive] = useState(false);
  const [role, setRole] = useState('');

  const refresh = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.auth.getSession();
      const t = s?.session?.access_token;
      if (!t) {
        setActive(false);
        return;
      }
      const res = await fetch('/api/cvneat-plus/status', {
        headers: { Authorization: `Bearer ${t}` },
        cache: 'no-store',
      });
      if (!res.ok) {
        setActive(false);
        return;
      }
      const b = await res.json();
      setActive(!!b.active);
    })();
  }, [pathname]);

  useEffect(() => {
    const readR = () => {
      try {
        const c = localStorage.getItem('cvneat-role-cache');
        if (c) {
          const r = (JSON.parse(c).role || '').toString().trim().toLowerCase();
          setRole(r);
        }
      } catch {
        setRole('');
      }
    };
    readR();
    const onR = () => readR();
    window.addEventListener('cvneat-role', onR);
    return () => window.removeEventListener('cvneat-role', onR);
  }, []);

  if (dismissed) return null;
  if (pathname.startsWith('/delivery') || pathname.startsWith('/admin')) return null;
  if (role === 'delivery' || role === 'livreur' || role === 'restaurant') return null;
  if (active) {
    return (
      <div className="w-full border-b border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-slate-900/80 text-emerald-950 dark:text-emerald-100">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="flex items-center gap-2 min-w-0">
            <FaTruck className="shrink-0 text-emerald-600" aria-hidden />
            <span>
              <strong className="font-semibold">{CVNEAT_PLUS_NAME} actif</strong> — remise 50 % sur les frais de
              livraison + frais plateforme offerts sur les commandes de {CVNEAT_PLUS_MIN_ORDER_EUR} €+ d’articles
              (après code promo, zone desservie).
            </span>
          </p>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem(DISMISS_KEY, '1');
              } catch {
                // ignore
              }
            }}
            className="p-1.5 rounded-md hover:bg-emerald-200/60 dark:hover:bg-emerald-800/50 transition-colors"
            aria-label="Fermer"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full border-b border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-slate-900/80 text-amber-950 dark:text-amber-50">
      <div className="max-w-6xl mx-auto px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="flex items-center gap-2 min-w-0">
          <FaStar className="shrink-0 text-amber-500" aria-hidden />
          <span>
            <strong className="font-semibold">{CVNEAT_PLUS_NAME}</strong> (CVN&apos;EAT) : −50 % sur les frais de
            livraison + frais plateforme offerts, dès {CVNEAT_PLUS_MIN_ORDER_EUR} € d&apos;articles.{' '}
            <Link href="/abonnement" className="font-semibold underline decoration-2 underline-offset-2">
              Voir l&apos;offre
            </Link>
          </span>
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <Link
            href="/abonnement"
            className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold"
          >
            S’abonner
          </Link>
          <button
            type="button"
            onClick={() => {
              setDismissed(true);
              try {
                localStorage.setItem(DISMISS_KEY, '1');
              } catch {
                // ignore
              }
            }}
            className="p-1.5 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-900/50 transition-colors"
            aria-label="Fermer"
          >
            <FaTimes className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
