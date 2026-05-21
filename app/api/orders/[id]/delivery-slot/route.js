import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import {
  generateDeliverySlotOptions,
  isWindowInAllowedRange,
} from '@/lib/delivery-slots';
import { notifyCustomerDeliverySlotChange } from '@/lib/delivery-slot-notify';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getAuthUser(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

async function getOrder(id) {
  const { data, error } = await supabaseAdmin.from('commandes').select('*').eq('id', id).single();
  if (error || !data) return null;
  return data;
}

async function getUserRole(userId) {
  const { data } = await supabaseAdmin.from('users').select('role').eq('id', userId).maybeSingle();
  return data?.role || null;
}

async function getRestaurantForUser(userId) {
  const { data } = await supabaseAdmin.from('restaurants').select('id').eq('user_id', userId).maybeSingle();
  return data;
}

/**
 * PATCH /api/orders/[id]/delivery-slot
 * Partenaire : confirm | fallback_asap | propose (confirmé auto + email client)
 * Client : accept_alternative (anciennes commandes uniquement)
 */
export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, note, proposedStart, proposedEnd } = body;

    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentification requise' }, { status: 401 });
    }

    const order = await getOrder(id);
    if (!order) {
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const role = await getUserRole(user.id);
    const now = new Date();
    let update = {};

    if (action === 'accept_alternative') {
      if (order.user_id !== user.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
      if (order.delivery_slot_status !== 'alternative') {
        return NextResponse.json({ error: 'Aucune proposition en attente' }, { status: 400 });
      }
      update = {
        delivery_slot_status: 'confirmed',
        delivery_slot_confirmed_start: order.delivery_slot_proposed_start,
        delivery_slot_confirmed_end: order.delivery_slot_proposed_end,
        delivery_slot_responded_at: now.toISOString(),
      };
    } else if (['confirm', 'fallback_asap', 'propose'].includes(action)) {
      if (!['restaurant', 'partner', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Rôle restaurant requis' }, { status: 403 });
      }
      const restaurant = await getRestaurantForUser(user.id);
      if (role !== 'admin' && restaurant?.id !== order.restaurant_id) {
        return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 });
      }

      if (action === 'confirm') {
        if (order.delivery_slot_type !== 'window') {
          return NextResponse.json({ error: 'Pas de créneau à confirmer' }, { status: 400 });
        }
        update = {
          delivery_slot_status: 'confirmed',
          delivery_slot_confirmed_start: order.delivery_slot_requested_start,
          delivery_slot_confirmed_end: order.delivery_slot_requested_end,
          delivery_slot_partner_note: note?.trim() || null,
          delivery_slot_responded_at: now.toISOString(),
        };
      } else if (action === 'fallback_asap') {
        update = {
          delivery_slot_status: 'fallback_asap',
          delivery_slot_confirmed_start: null,
          delivery_slot_confirmed_end: null,
          delivery_slot_proposed_start: null,
          delivery_slot_proposed_end: null,
          delivery_slot_partner_note: note?.trim() || 'Livraison au plus tôt',
          delivery_slot_responded_at: now.toISOString(),
        };
      } else if (action === 'propose') {
        if (!isWindowInAllowedRange(proposedStart, proposedEnd, now)) {
          return NextResponse.json({ error: 'Créneau proposé invalide' }, { status: 400 });
        }
        // Confirmé tout de suite : beaucoup de clients ne consultent pas la page suivi
        update = {
          delivery_slot_status: 'confirmed',
          delivery_slot_confirmed_start: proposedStart,
          delivery_slot_confirmed_end: proposedEnd,
          delivery_slot_proposed_start: null,
          delivery_slot_proposed_end: null,
          delivery_slot_partner_note: note?.trim() || null,
          delivery_slot_responded_at: now.toISOString(),
        };
      }
    } else {
      return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
    }

    const { data: updated, error: updErr } = await supabaseAdmin
      .from('commandes')
      .update(update)
      .eq('id', id)
      .select(
        'id, delivery_slot_type, delivery_slot_status, delivery_slot_requested_start, delivery_slot_requested_end, delivery_slot_confirmed_start, delivery_slot_confirmed_end, delivery_slot_proposed_start, delivery_slot_proposed_end, delivery_slot_partner_note'
      )
      .single();

    if (updErr) {
      console.error('delivery-slot update:', updErr);
      return NextResponse.json(
        { error: 'Mise à jour impossible', details: updErr.message },
        { status: 500 }
      );
    }

    const { data: resto } = await supabaseAdmin
      .from('restaurants')
      .select('nom')
      .eq('id', order.restaurant_id)
      .maybeSingle();

    const notifyEvent =
      action === 'confirm' ? 'confirm' : action === 'propose' ? 'propose' : action === 'fallback_asap' ? 'fallback_asap' : null;
    if (notifyEvent) {
      notifyCustomerDeliverySlotChange({ ...order, ...updated, restaurants: resto }, notifyEvent, {
        restaurantName: resto?.nom,
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, order: updated });
  } catch (e) {
    console.error('PATCH delivery-slot:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request, { params }) {
  const order = await getOrder(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
  }
  return NextResponse.json({
    order: {
      delivery_slot_type: order.delivery_slot_type,
      delivery_slot_status: order.delivery_slot_status,
      delivery_slot_requested_start: order.delivery_slot_requested_start,
      delivery_slot_requested_end: order.delivery_slot_requested_end,
      delivery_slot_confirmed_start: order.delivery_slot_confirmed_start,
      delivery_slot_confirmed_end: order.delivery_slot_confirmed_end,
      delivery_slot_proposed_start: order.delivery_slot_proposed_start,
      delivery_slot_proposed_end: order.delivery_slot_proposed_end,
      delivery_slot_partner_note: order.delivery_slot_partner_note,
    },
    proposeOptions: generateDeliverySlotOptions(),
  });
}
