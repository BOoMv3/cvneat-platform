'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { CVNEAT_PLUS_PITCH, CVNEAT_PLUS_NAME, CVNEAT_PLUS_MIN_ORDER_EUR } from '@/lib/cvneat-plus';
import { FaCheck, FaTruck, FaExternalLinkAlt } from 'react-icons/fa';

export default function AbonnementPage() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [active, setActive] = useState(false);
  const [endsAt, setEndsAt] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);
  const [sessionBusy, setSessionBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setCheckoutError(null);
    const { data: s } = await supabase.auth.getSession();
    const t = s?.session?.access_token;
    if (!t) {
      setSignedIn(false);
      setActive(false);
      setLoading(false);
      return;
    }
    setSignedIn(true);
    const res = await fetch('/api/cvneat-plus/status', {
      headers: { Authorization: `Bearer ${t}` },
      cache: 'no-store',
    });
    const b = await res.json().catch(() => ({}));
    setActive(!!b.active);
    setEndsAt(b.endsAt || null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const startCheckout = async () => {
    setSessionBusy(true);
    setCheckoutError(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const t = s?.session?.access_token;
      if (!t) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('redirectAfterLogin', '/abonnement');
        }
        window.location.href = '/login?redirect=abonnement';
        return;
      }
      const res = await fetch('/api/cvneat-plus/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ successPath: '/abonnement', cancelPath: '/abonnement' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setCheckoutError(data?.error || 'Impossible de démarrer le paiement');
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError('Lien d’abonnement indisponible');
      }
    } catch (e) {
      setCheckoutError(e?.message || 'Erreur réseau');
    } finally {
      setSessionBusy(false);
    }
  };

  const openPortal = async () => {
    setSessionBusy(true);
    setCheckoutError(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const t = s?.session?.access_token;
      if (!t) return;
      const res = await fetch('/api/cvneat-plus/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${t}`,
        },
        body: JSON.stringify({ returnPath: '/abonnement' }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) window.location.href = data.url;
      else setCheckoutError(data?.error || 'Portail indisponible');
    } catch (e) {
      setCheckoutError(e?.message || 'Erreur');
    } finally {
      setSessionBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-10 sm:py-14">
        <h1 className="text-3xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400 mb-2">{CVNEAT_PLUS_NAME}</h1>
        <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
          Moins de frais, plus de commandes chez les restaurateurs locaux — sans passer par les géants nationaux.
        </p>

        <div className="rounded-2xl border border-amber-200/80 dark:border-amber-800/40 bg-white dark:bg-slate-900/60 p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <FaTruck className="text-amber-500" />
            Ce que vous avez
          </h2>
          <ul className="space-y-2 text-slate-700 dark:text-slate-200">
            {CVNEAT_PLUS_PITCH.benefits.map((b) => (
              <li key={b} className="flex gap-2">
                <FaCheck className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                {b}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {CVNEAT_PLUS_PITCH.competitorLabel} Nous, on reste 100 % local (Ganges, Cazilhac, St-Hippolyte-du-Fort, etc. selon
            notre calque de livraison) avec un abonnement adapté.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Tarif indicatif (Stripe)</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              dès {CVNEAT_PLUS_PITCH.monthlyEur.toFixed(2).replace('.', ',')} €/mois
            </p>
            <p className="text-xs text-slate-500 mt-1">Offre annuelle possible sur demande côté Stripe (49,99 €/an cible).</p>
          </div>
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5">
            <p className="text-sm text-slate-500 dark:text-slate-400">Commande éligible</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">≥ {CVNEAT_PLUS_MIN_ORDER_EUR} €</p>
            <p className="text-xs text-slate-500 mt-1">Sous-total articles, après remise code promo. La remise côté livraison est 50 % : le reste paie la course.</p>
          </div>
        </div>

        {loading ? (
          <p className="text-slate-500">Chargement…</p>
        ) : !signedIn ? (
          <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/50 p-4">
            <p className="mb-3">Connectez-vous pour vous abonner et lier l’abonnement à votre compte.</p>
            <Link
              href="/login?redirect=abonnement"
              className="inline-block px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold"
            >
              Se connecter
            </Link>
          </div>
        ) : active ? (
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/80 dark:bg-emerald-950/20 p-5">
            <p className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">Abonnement actif</p>
            {endsAt && (
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                Période en cours (fin indicatif UTC) : {new Date(endsAt).toLocaleString('fr-FR')}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sessionBusy}
                onClick={openPortal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 font-medium"
              >
                <FaExternalLinkAlt className="h-3 w-3" />
                Gérer l’abonnement (facturation, carte)
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {checkoutError && <p className="text-sm text-red-600 dark:text-red-400">{checkoutError}</p>}
            <p className="text-sm text-slate-500">
              Paiement sécurisé par Stripe. L’abonnement est lié à votre e-mail de compte CVN&apos;EAT.
            </p>
            <button
              type="button"
              disabled={sessionBusy}
              onClick={startCheckout}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold shadow-md hover:from-amber-600 hover:to-orange-600 disabled:opacity-60"
            >
              {sessionBusy ? 'Redirection…' : `S’abonner à ${CVNEAT_PLUS_NAME}`}
            </button>
          </div>
        )}

        <p className="mt-10 text-sm text-slate-500">
          <Link href="/" className="text-orange-600 dark:text-orange-400 hover:underline">
            Retour à l’accueil
          </Link>
        </p>
      </div>
    </div>
  );
}
