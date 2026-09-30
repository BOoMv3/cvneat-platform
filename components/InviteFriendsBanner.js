'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaCopy, FaShareAlt, FaGift, FaCheck } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

/**
 * Bloc « Invite tes amis » (style GoManger) — visible si connecté.
 */
export default function InviteFriendsBanner() {
  const [session, setSession] = useState(null);
  const [code, setCode] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data?.session || null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!session?.access_token) {
      setCode('');
      setShareUrl('');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/referral/my-code', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error || 'Erreur');
        if (!cancelled) {
          setCode(json.code || '');
          setShareUrl(json.shareUrl || '');
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Impossible de charger le code');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.access_token]);

  const copy = async () => {
    const text = shareUrl || code;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible');
    }
  };

  const share = async () => {
    const text = `Commande sur CVN'EAT avec mon code ${code} : -5 € sur ta première commande ! ${shareUrl}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "CVN'EAT", text, url: shareUrl });
        return;
      } catch {
        /* fallback copy */
      }
    }
    await copy();
  };

  if (!session) {
    return (
      <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Parrainage</p>
            <h3 className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
              Invite tes amis sur CVN&apos;EAT
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Connecte-toi pour obtenir ton lien : -5&nbsp;€ sur leur première commande.
            </p>
          </div>
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-600"
          >
            <FaGift />
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-orange-200/80 bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-wider text-orange-600">Parrainage</p>
          <h3 className="mt-1 text-xl font-black text-gray-900 sm:text-2xl">
            Invite tes amis sur CVN&apos;EAT
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            Ils gagnent <strong>-5&nbsp;€</strong> sur leur 1ʳᵉ commande. Ton code&nbsp;:{' '}
            <span className="font-mono font-bold text-orange-700">
              {loading ? '…' : code || '—'}
            </span>
          </p>
          {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={copy}
            disabled={!code || loading}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-300 bg-white px-4 py-2.5 text-sm font-bold text-orange-700 hover:bg-orange-50 disabled:opacity-50"
          >
            {copied ? <FaCheck /> : <FaCopy />}
            {copied ? 'Copié' : 'Copier'}
          </button>
          <button
            type="button"
            onClick={share}
            disabled={!code || loading}
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
          >
            <FaShareAlt />
            Partager
          </button>
        </div>
      </div>
    </div>
  );
}
