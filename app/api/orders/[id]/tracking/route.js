import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log('✅ Tracking récupéré:', {
      orderId: order.id,
      status: order.statut,
      hasDelivery: !!order.livreur_id,
      hasPosition: !!(order.livreur_latitude && order.livreur_longitude)
    });

    // Préparer les données de tracking
    const trackingData = {
      orderId: order.id,
      status: order.statut,
      
      // Informations du restaurant (point de départ)
      restaurant: order.restaurants ? {
        name: order.restaurants.nom,
        address: order.restaurants.adresse,
        latitude: order.restaurants.latitude,
        longitude: order.restaurants.longitude
      } : null,
      
      // Informations de livraison (point d'arrivée)
      delivery: {
        address: order.adresse_livraison,
        latitude: order.latitude_livraison,
        longitude: order.longitude_livraison
      },
      
      // Informations du livreur
      driver: order.livreur_id && order.users ? {
        id: order.users.id,
        name: `${order.users.prenom} ${order.users.nom}`,
        phone: order.users.telephone,
        photo: order.users.photo_url,
        
        // Position actuelle du livreur
        currentPosition: order.livreur_latitude && order.livreur_longitude ? {
          latitude: parseFloat(order.livreur_latitude),
          longitude: parseFloat(order.livreur_longitude),
          lastUpdate: order.livreur_position_updated_at
        } : null
      } : null,
      
      // Timestamps
      createdAt: order.created_at
    };

    return NextResponse.json(trackingData);

  } catch (error) {
    console.error('❌ Erreur API tracking:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

