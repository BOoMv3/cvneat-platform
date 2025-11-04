import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  const { id } = params;
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return NextResponse.json({ message: "Erreur lors de la récupération du restaurant", error }, { status: 500 });
  }

  // Calculer la note moyenne depuis les vrais avis
  const { data: reviews, error: reviewsError } = await supabase
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
} 