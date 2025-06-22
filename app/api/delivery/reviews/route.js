import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;

    // Récupérer les commandes avec notes et commentaires
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: reviews, error, count } = await supabase
      .from('commandes')
      .select(`
        id,
        note_livreur,
        commentaire_livreur,
        created_at,
        users(nom, prenom),
        restaurants(nom)
      `)
      .eq('livreur_id', deliveryId)
      .not('note_livreur', 'is', null)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Erreur récupération avis:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des avis' },
        { status: 500 }
      );
    }

    // Formater les données
    const formattedReviews = reviews?.map(review => ({
      id: review.id,
      rating: review.note_livreur,
      comment: review.commentaire_livreur,
      customer_name: `${review.users?.prenom || ''} ${review.users?.nom || ''}`.trim(),
      restaurant_name: review.restaurants?.nom || 'Restaurant inconnu',
      date: review.created_at
    })) || [];

    return NextResponse.json({
      reviews: formattedReviews,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });
  } catch (error) {
    console.error('Erreur API avis:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 