import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { refreshRestaurantRating } from '@/lib/restaurant-ratings';

function getAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

// GET - Récupérer les avis d'un restaurant
export async function GET(request, { params }) {
  try {
    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const { data, error } = await admin
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
    const admin = getAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Configuration serveur manquante' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const body = await request.json();
    let userId = body.userId;
    const { rating, comment } = body;

    if (token) {
      const userClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        { global: { headers: { Authorization: `Bearer ${token}` } } }
      );
      const { data: { user } } = await userClient.auth.getUser(token);
      if (user?.id) userId = user.id;
    }

    if (!userId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    }

    const { data: orders } = await admin
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

    const { data: existingReview } = await admin
      .from('reviews')
      .select('id')
      .eq('user_id', userId)
      .eq('restaurant_id', params.id)
      .maybeSingle();

    if (existingReview) {
      const { error: upErr } = await admin
        .from('reviews')
        .update({ rating, comment: comment || null })
        .eq('id', existingReview.id);
      if (upErr) {
        return NextResponse.json({ error: 'Erreur lors de la mise à jour de l\'avis' }, { status: 500 });
      }
      await refreshRestaurantRating(admin, params.id);
      return NextResponse.json({ message: 'Avis mis à jour' }, { status: 200 });
    }

    const { data, error } = await admin
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

    await refreshRestaurantRating(admin, params.id);

    return NextResponse.json({ message: 'Avis ajouté avec succès', data }, { status: 201 });
  } catch (error) {
    console.error('Erreur API avis POST:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500 });
  }
}
