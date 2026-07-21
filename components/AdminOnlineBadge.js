'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaCircle } from 'react-icons/fa';

const CHANNEL = 'cvneat-site-presence';

function countOnline(state) {
  return Object.keys(state || {}).length;
}

/**
 * Badge live « X en ligne » pour le dashboard admin.
 * Clique → /admin/presence
 */
export default function AdminOnlineBadge({ className = '' }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let channel = null;
    let cancelled = false;

    channel = supabase.channel(CHANNEL);

    const sync = () => {
      if (cancelled) return;
      setCount(countOnline(channel.presenceState()));
    };

    channel
      .on('presence', { event: 'sync' }, sync)
      .on('presence', { event: 'join' }, sync)
      .on('presence', { event: 'leave' }, sync)
      .subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          setConnected(true);
          sync();
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setConnected(false);
        }
      });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => router.push('/admin/presence')}
      title="Voir qui est en ligne"
      className={`inline-flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-colors flex-shrink-0 ${
        connected
          ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-200'
          : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400'
      } ${className}`}
    >
      <FaCircle
        className={`h-2 w-2 ${connected ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`}
      />
      <span>
        <span className="tabular-nums">{count}</span>
        <span className="hidden xs:inline"> en ligne</span>
      </span>
    </button>
  );
}
