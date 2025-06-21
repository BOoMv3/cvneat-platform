import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const status = searchParams.get('status'); // Filtre par statut
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construire la requête
    let query = supabase
      .from('commandes')
      .select(`
        *,
        restaurants(nom, adresse),
        users(nom, prenom, email, telephone)
      `)
      .eq('livreur_id', deliveryId)
      .order('created_at', { ascending: false });

    // Appliquer les filtres
    if (status) {
      query = query.eq('statut', status);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data: orders, error, count } = await query;

    if (error) {
      console.error('Erreur récupération historique:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération de l\'historique' },
        { status: 500 }
      );
    }

    // Formater les données
    const formattedOrders = orders?.map(order => ({
      id: order.id,
      restaurant_nom: order.restaurants?.nom || 'Restaurant inconnu',
      restaurant_adresse: order.restaurants?.adresse || 'Adresse inconnue',
      customer_name: `${order.users?.prenom || ''} ${order.users?.nom || ''}`.trim(),
      customer_phone: order.users?.telephone || '',
      delivery_address: order.adresse_livraison,
      total: order.montant_total,
      delivery_fee: order.frais_livraison,
      status: order.statut,
      created_at: order.created_at,
      updated_at: order.updated_at,
      rating: order.note_livreur,
      comment: order.commentaire_livreur
    })) || [];

    return NextResponse.json({
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erreur API historique:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 