import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    // Pour l'instant, on simule l'ID du livreur
    // En production, vous récupéreriez l'ID depuis le token JWT
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Récupérer la commande en cours du livreur
    const { data: order, error } = await supabase
      .from('orders')
      .select(`
        *,
        restaurant:restaurants(nom, adresse)
      `)
      .eq('delivery_id', deliveryId)
      .in('status', ['in_delivery', 'ready_for_delivery'])
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Erreur récupération commande en cours:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de la commande' },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(null);
    }

    // Formater les données
    const formattedOrder = {
      id: order.id,
      restaurant_name: order.restaurant?.nom || 'Restaurant inconnu',
      restaurant_address: order.restaurant?.adresse || 'Adresse inconnue',
      customer_email: order.customer_email || 'Email inconnu',
      delivery_address: order.delivery_address,
      total: order.total_amount,
      delivery_fee: order.delivery_fee,
      status: order.status,
      created_at: order.created_at,
      estimated_time: 30
    };

    return NextResponse.json(formattedOrder);
  } catch (error) {
    console.error('Erreur API commande en cours:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 