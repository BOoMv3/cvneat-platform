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

  // Prioriser les notes Google pour chaque restaurant
  const restaurantsWithRatings = (data || []).map((restaurant) => {
    // Si le restaurant a une note Google, l'utiliser
    if (restaurant.google_rating) {
      return {
        ...restaurant,
        rating: restaurant.google_rating,
        reviews_count: restaurant.google_reviews_count || restaurant.reviews_count || 0
      };
    }

    // Sinon, utiliser les notes calculées depuis les avis (fallback)
    // Note: Pour optimiser, on pourrait calculer en batch si nécessaire
    return {
      ...restaurant,
      rating: restaurant.rating || 0,
      reviews_count: restaurant.reviews_count || 0
    };
  });

  return NextResponse.json(restaurantsWithRatings);
} 