'use client';

import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  formatSlotRangeParis,
  generateDeliverySlotOptions,
  getEffectiveDeliverySlot,
} from '@/lib/delivery-slots';

export default function PartnerOrderDeliverySlotPanel({ order, onUpdated }) {
  const slot = useMemo(() => getEffectiveDeliverySlot(order), [order]);
  const [loading, setLoading] = useState(false);
  const [showPropose, setShowPropose] = useState(false);
  const [proposedId, setProposedId] = useState('');
  const [note, setNote] = useState('');

  const proposeOptions = useMemo(
    () => generateDeliverySlotOptions().filter((s) => s.type === 'window'),
    []
  );

  if (!slot || slot.type === 'asap') return null;

  const patchSlot = async (action, extra = {}) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Session expirée');

      const res = await fetch(`/api/orders/${order.id}/delivery-slot`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ action, note: note.trim() || undefined, ...extra }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Erreur');
      setShowPropose(false);
      setNote('');
      if (onUpdated) await onUpdated();
    } catch (e) {
      alert(e.message || 'Impossible de mettre à jour le créneau');
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = () => {
    const opt = proposeOptions.find((o) => o.id === proposedId);
    if (!opt?.start || !opt?.end) {
      alert('Choisissez un créneau à proposer');
      return;
    }
    patchSlot('propose', { proposedStart: opt.start, proposedEnd: opt.end });
  };

  const bg =
    slot.status === 'pending'
      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700'
      : slot.status === 'confirmed'
        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700'
        : slot.status === 'alternative'
          ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700'
          : 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600';

  return (
    <div className={`mt-4 p-3 rounded-lg border ${bg}`}>
      <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">🕐 Créneau de livraison client</h4>
      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        Demandé : {formatSlotRangeParis(order.delivery_slot_requested_start, order.delivery_slot_requested_end)}
      </p>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{slot.statusLabel}</p>
      {order.delivery_slot_partner_note && (
        <p className="text-xs mt-1 italic text-gray-700 dark:text-gray-300">{order.delivery_slot_partner_note}</p>
      )}
      {slot.status === 'confirmed' && slot.start && (
        <p className="text-xs mt-1 text-emerald-800 dark:text-emerald-300 font-medium">
          Confirmé : {formatSlotRangeParis(slot.start, slot.end)}
        </p>
      )}
      {slot.status === 'alternative' && slot.start && (
        <p className="text-xs mt-1 text-blue-800 dark:text-blue-300 font-medium">
          Proposé au client : {formatSlotRangeParis(slot.start, slot.end)}
        </p>
      )}

      {slot.status === 'pending' && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => patchSlot('confirm')}
            className="px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            Confirmer ce créneau
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => patchSlot('fallback_asap')}
            className="px-3 py-1.5 text-xs font-semibold bg-gray-700 text-white rounded hover:bg-gray-800 disabled:opacity-50"
          >
            Pas possible → au plus tôt
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => setShowPropose((v) => !v)}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Proposer un autre créneau (confirmé + email client)
          </button>
        </div>
      )}

      {showPropose && slot.status === 'pending' && (
        <div className="mt-3 space-y-2">
          <select
            value={proposedId}
            onChange={(e) => setProposedId(e.target.value)}
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">— Choisir un créneau —</option>
            {proposeOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Message optionnel au client"
            className="w-full text-sm border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-2 bg-white dark:bg-gray-700"
          />
          <button
            type="button"
            disabled={loading}
            onClick={handlePropose}
            className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirmer ce nouveau créneau
          </button>
        </div>
      )}
    </div>
  );
}
