import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, frais_livraison');
    // .eq('status', 'active'); // Temporairement désactivé pour debug

  if (error) {
    console.error('Erreur Supabase lors de la récupération des restaurants:', error);
    return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
  }

  // Calculer les notes depuis les vrais avis pour chaque restaurant
  const restaurantsWithRatings = await Promise.all((data || []).map(async (restaurant) => {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('restaurant_id', restaurant.id);

    let calculatedRating = 0;
    let reviewsCount = 0;
    if (reviews && reviews.length > 0) {
      const totalRating = reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
      calculatedRating = Math.round((totalRating / reviews.length) * 10) / 10;
      reviewsCount = reviews.length;
    }

    return {
      ...restaurant,
      rating: calculatedRating || restaurant.rating || 0,
      reviews_count: reviewsCount || restaurant.reviews_count || 0
    };
  }));

  return NextResponse.json(restaurantsWithRatings);
} // Cache invalidation Wed Dec 10 18:45:36 CET 2025
