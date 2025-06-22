import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    // Récupérer les commandes prêtes à être livrées et non assignées
    const { data: orders, error } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse)
      `)
      .eq('statut', 'pret_a_livrer')
      .is('delivery_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération commandes disponibles:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des commandes' },
        { status: 500 }
      );
    }

    // Formater les données pour l'affichage
    const formattedOrders = orders?.map(order => ({
      id: order.id,
      restaurant_nom: order.restaurant?.nom || 'Restaurant inconnu',
      restaurant_adresse: order.restaurant?.adresse || 'Adresse inconnue',
      customer_email: order.customer?.email || 'Email inconnu',
      delivery_address: order.adresse_livraison,
      total: order.montant_total,
      delivery_fee: order.frais_livraison,
      created_at: order.created_at,
      estimated_time: 30 // Temps estimé en minutes
    })) || [];

    return NextResponse.json(formattedOrders);
  } catch (error) {
    console.error('Erreur API commandes disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 