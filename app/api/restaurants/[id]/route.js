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

  // Prioriser la note Google si disponible, sinon utiliser les notes calculées
  let rating = data.google_rating;
  let reviewsCount = data.google_reviews_count;

  // Si pas de note Google, calculer depuis les avis de la base de données
  if (!rating && (!data.google_place_id || !data.google_rating)) {
    const { data: reviews, error: reviewsError } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', id);

    let calculatedRating = 0;
    let calculatedCount = 0;
    if (!reviewsError && reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      calculatedRating = Math.round((totalRating / reviews.length) * 10) / 10;
      calculatedCount = reviews.length;
    }
    
    rating = calculatedRating || data.rating || 0;
    reviewsCount = calculatedCount || data.reviews_count || 0;
  }

  // Ajouter les valeurs par défaut pour les colonnes manquantes
  const restaurantWithDefaults = {
    ...data,
    frais_livraison: data.frais_livraison || 2.50,
    deliveryTime: data.deliveryTime || 30,
    minOrder: data.minOrder || 15,
    rating: rating, // Prioriser Google, sinon calculée
    reviews_count: reviewsCount, // Prioriser Google, sinon calculée
    mise_en_avant: data.mise_en_avant || false,
    mise_en_avant_fin: data.mise_en_avant_fin || null
  };

  return NextResponse.json(restaurantWithDefaults);
} 