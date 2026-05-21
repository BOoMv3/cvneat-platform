import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
  DELIVERY_SLOT_ALTERNATIVE_AUTO_CONFIRM_MS,
  getEffectiveDeliverySlot,
} from '@/lib/delivery-slots';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET - Récupérer les informations de suivi d'une commande (position GPS du livreur)
export async function GET(request, { params }) {
  try {
    const { id } = params;

    console.log('📡 Récupération tracking pour commande:', id);

    // Récupérer la commande avec les informations du livreur et de livraison
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        statut,
        livreur_id,
        livreur_latitude,
        livreur_longitude,
        livreur_position_updated_at,
        adresse_livraison,
        latitude_livraison,
        longitude_livraison,
        created_at,
        delivery_slot_type,
        delivery_slot_status,
        delivery_slot_requested_start,
        delivery_slot_requested_end,
        delivery_slot_confirmed_start,
        delivery_slot_confirmed_end,
        delivery_slot_proposed_start,
        delivery_slot_proposed_end,
        delivery_slot_responded_at,
        delivery_slot_partner_note,
        users:livreur_id (
          id,
          prenom,
          nom,
          telephone,
          photo_url
        ),
        restaurants (
          id,
          nom,
          adresse,
          latitude,
          longitude
        )
      `)
      .eq('id', id)
      .single();

    if (orderError || !order) {
      console.error('❌ Erreur récupération commande:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    let orderRow = order;
    if (
      orderRow.delivery_slot_status === 'alternative' &&
      orderRow.delivery_slot_proposed_start &&
      orderRow.delivery_slot_proposed_end
    ) {
      const respondedMs = orderRow.delivery_slot_responded_at
        ? new Date(orderRow.delivery_slot_responded_at).getTime()
        : 0;
      const staleMs = Date.now() - (respondedMs || 0);
      if (staleMs > DELIVERY_SLOT_ALTERNATIVE_AUTO_CONFIRM_MS) {
        const { data: fixed } = await supabaseAdmin
          .from('commandes')
          .update({
            delivery_slot_status: 'confirmed',
            delivery_slot_confirmed_start: orderRow.delivery_slot_proposed_start,
            delivery_slot_confirmed_end: orderRow.delivery_slot_proposed_end,
            delivery_slot_proposed_start: null,
            delivery_slot_proposed_end: null,
          })
          .eq('id', id)
          .select(
            'delivery_slot_type, delivery_slot_status, delivery_slot_requested_start, delivery_slot_requested_end, delivery_slot_confirmed_start, delivery_slot_confirmed_end, delivery_slot_proposed_start, delivery_slot_proposed_end, delivery_slot_responded_at, delivery_slot_partner_note'
          )
          .single();
        if (fixed) orderRow = { ...orderRow, ...fixed };
      }
    }

    console.log('✅ Tracking récupéré:', {
      orderId: orderRow.id,
      status: orderRow.statut,
      hasDelivery: !!orderRow.livreur_id,
      hasPosition: !!(orderRow.livreur_latitude && orderRow.livreur_longitude)
    });

    // Préparer les données de tracking
    const trackingData = {
      orderId: orderRow.id,
      status: orderRow.statut,
      
      // Informations du restaurant (point de départ)
      restaurant: orderRow.restaurants ? {
        name: orderRow.restaurants.nom,
        address: orderRow.restaurants.adresse,
        latitude: orderRow.restaurants.latitude,
        longitude: orderRow.restaurants.longitude
      } : null,
      
      // Informations de livraison (point d'arrivée)
      delivery: {
        address: orderRow.adresse_livraison,
        latitude: orderRow.latitude_livraison,
        longitude: orderRow.longitude_livraison
      },
      
      // Informations du livreur
      driver: orderRow.livreur_id && orderRow.users ? {
        id: orderRow.users.id,
        name: `${orderRow.users.prenom} ${orderRow.users.nom}`,
        phone: orderRow.users.telephone,
        photo: orderRow.users.photo_url,
        
        // Position actuelle du livreur
        currentPosition: orderRow.livreur_latitude && orderRow.livreur_longitude ? {
          latitude: parseFloat(orderRow.livreur_latitude),
          longitude: parseFloat(orderRow.livreur_longitude),
          lastUpdate: orderRow.livreur_position_updated_at
        } : null
      } : null,
      
      // Timestamps
      createdAt: orderRow.created_at,

      deliverySlot: getEffectiveDeliverySlot(orderRow),
      deliverySlotRaw: {
        type: orderRow.delivery_slot_type,
        status: orderRow.delivery_slot_status,
        partnerNote: orderRow.delivery_slot_partner_note,
      },
    };

    return NextResponse.json(trackingData);

  } catch (error) {
    console.error('❌ Erreur API tracking:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

