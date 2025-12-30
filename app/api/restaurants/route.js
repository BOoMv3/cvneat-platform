import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Désactiver le cache pour cette route afin d'avoir toujours les données à jour
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Créer un client admin pour bypasser RLS
let supabaseAdmin = null;

try {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Variables d\'environnement manquantes:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!serviceRoleKey
    });
  } else {
    supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    console.log('✅ Client Supabase Admin initialisé');
  }
} catch (error) {
  console.error('❌ Erreur initialisation Supabase Admin:', error);
}

export async function GET() {
  try {
    console.log('🔍 API /api/restaurants appelée');
    console.log('🔍 NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Défini' : 'MANQUANT');
    console.log('🔍 SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Défini' : 'MANQUANT');
    
    if (!supabaseAdmin) {
      console.error('❌ Client Supabase Admin non initialisé');
      return NextResponse.json(
        { message: "Configuration Supabase manquante", error: "Variables d'environnement non définies" },
        { status: 500 }
      );
    }
    
    const { data, error } = await supabaseAdmin
      .from('restaurants')
      .select('*, frais_livraison, ferme_manuellement');
      // .eq('status', 'active'); // Temporairement désactivé pour debug

    if (error) {
      console.error('❌ Erreur Supabase lors de la récupération des restaurants:', error);
      console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
      return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
    }

    console.log(`📊 ${data?.length || 0} restaurant(s) trouvé(s) dans la base de données`);

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
