import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

// GET - Récupérer les avis d'un restaurant
export async function GET(request, { params }) {
  try {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        comment,
        created_at,
        user_id,
        users:users!user_id (
          nom,
          prenom,
          avatar_url
        )
      `)
      .eq('restaurant_id', params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur lors de la récupération des avis:', error);
      return NextResponse.json({ error: 'Erreur lors de la récupération des avis' }, { status: 500 });
    }

    // Transformer les données pour avoir un format cohérent
    const formattedReviews = (data || []).map(review => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment,
      date: review.created_at,
      user_id: review.user_id,
      name: review.users ? `${review.users.prenom || ''} ${review.users.nom || ''}`.trim() || 'Client' : 'Client',
      avatar_url: review.users?.avatar_url || null
    }));

    return NextResponse.json(formattedReviews);
  } catch (error) {
    console.error('Erreur API avis GET:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// POST - Ajouter un avis
export async function POST(request, { params }) {
  try {
    const { userId, rating, comment } = await request.json();

    if (!userId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    // Vérifier que l'utilisateur a une commande livrée pour ce restaurant
    const { data: orders } = await supabase
      .from('commandes')
      .select('id, restaurant_id, statut')
      .eq('user_id', userId)
      .eq('restaurant_id', params.id)
      .eq('statut', 'livree');

    if (!orders || orders.length === 0) {
      return NextResponse.json({ 
        error: 'Vous devez avoir une commande livrée pour ce restaurant avant de pouvoir laisser un avis' 
      }, { status: 403 });
    }

    // Vérifier si l'utilisateur a déjà laissé un avis pour ce restaurant
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', params.id)
      .single();

    if (existingReview) {
      return NextResponse.json({ error: 'Vous avez déjà laissé un avis pour ce restaurant' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([{
        user_id: userId,
        restaurant_id: params.id,
        rating: rating,
        comment: comment || null
      }])
      .select();

    if (error) {
      console.error('Erreur lors de l\'ajout de l\'avis:', error);
      return NextResponse.json({ error: 'Erreur lors de l\'ajout de l\'avis' }, { status: 500 });
    }

    // Mettre à jour la note moyenne du restaurant
    await updateRestaurantRating(params.id);

    return NextResponse.json({ message: 'Avis ajouté avec succès', data }, { status: 201 });
  } catch (error) {
    console.error('Erreur API avis POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}

// Fonction pour mettre à jour la note moyenne d'un restaurant
async function updateRestaurantRating(restaurantId) {
  try {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', restaurantId);

    if (reviews && reviews.length > 0) {
      const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      
      await supabase
        .from('restaurants')
        .update({ 
          rating: Math.round(averageRating * 10) / 10,
          reviews_count: reviews.length 
        })
        .eq('id', restaurantId);
    }
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la note:', error);
  }
}
