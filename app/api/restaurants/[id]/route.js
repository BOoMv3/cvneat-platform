import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erreur récupération restaurant:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération du restaurant", error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ message: "Restaurant non trouvé" }, { status: 404 });
    }

    // Calculer la note moyenne depuis les vrais avis
    const { data: reviews, error: reviewsError } = await supabaseAdmin
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', id);

  let calculatedRating = 0;
  let reviewsCount = 0;
  if (!reviewsError && reviews && reviews.length > 0) {
    const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    calculatedRating = Math.round((totalRating / reviews.length) * 10) / 10;
    reviewsCount = reviews.length;
  }

    // Ajouter les valeurs par défaut pour les colonnes manquantes
    const restaurantWithDefaults = {
      ...data,
      frais_livraison: data.frais_livraison || 2.50,
      deliveryTime: data.deliveryTime || 30,
      minOrder: data.minOrder || 15,
      rating: calculatedRating || data.rating || 0, // Utiliser la note calculée ou celle de la DB
      reviews_count: reviewsCount || data.reviews_count || 0,
      mise_en_avant: data.mise_en_avant || false,
      mise_en_avant_fin: data.mise_en_avant_fin || null
    };

    return NextResponse.json(restaurantWithDefaults);
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération du restaurant:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération du restaurant", error: error.message },
      { status: 500 }
    );
  }
} 