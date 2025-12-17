import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*, frais_livraison');
      // .eq('status', 'active'); // Temporairement désactivé pour debug

    if (error) {
      console.error('Erreur Supabase lors de la récupération des restaurants:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ Aucun restaurant trouvé dans la base de données');
      return NextResponse.json([]);
    }

    // Calculer les notes depuis les vrais avis pour chaque restaurant
    const restaurantsWithRatings = await Promise.all((data || []).map(async (restaurant) => {
      const { data: reviews } = await supabaseAdmin
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

    console.log(`✅ ${restaurantsWithRatings.length} restaurant(s) récupéré(s)`);
    return NextResponse.json(restaurantsWithRatings);
  } catch (error) {
    console.error('❌ Erreur serveur lors de la récupération des restaurants:', error);
    return NextResponse.json(
      { message: "Erreur serveur lors de la récupération des restaurants", error: error.message },
      { status: 500 }
    );
  }
}
