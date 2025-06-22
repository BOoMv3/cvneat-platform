import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    // Pour l'instant, on simule l'ID du livreur
    // En production, vous récupéreriez l'ID depuis le token JWT
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Récupérer la commande en cours du livreur
    const { data: order, error } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse),
        customer:users!commandes_user_id_fkey(nom, prenom, email, telephone)
      `)
      .eq('livreur_id', deliveryId)
      .in('statut', ['en_livraison', 'pret_a_livrer'])
      .order('created_at', { ascending: false })
      .limit(1)
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
      restaurant_nom: order.restaurant?.nom || 'Restaurant inconnu',
      restaurant_adresse: order.restaurant?.adresse || 'Adresse inconnue',
      customer_name: `${order.customer?.prenom || ''} ${order.customer?.nom || ''}`.trim(),
      customer_phone: order.customer?.telephone || '',
      delivery_address: order.adresse_livraison,
      total: order.montant_total,
      delivery_fee: order.frais_livraison,
      status: order.statut,
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