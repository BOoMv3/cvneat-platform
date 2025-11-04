import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// GET - Récupérer les notes Google pour un restaurant
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurant_id');
    const placeId = searchParams.get('place_id');

    if (!restaurantId && !placeId) {
      return NextResponse.json({ error: 'restaurant_id ou place_id requis' }, { status: 400 });
    }

    // Si on a un place_id, récupérer depuis Google Places API
    if (placeId) {
      const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!googleApiKey) {
        return NextResponse.json({ 
          error: 'Google Places API key non configurée. Veuillez configurer GOOGLE_PLACES_API_KEY dans les variables d\'environnement.' 
        }, { status: 500 });
      }

      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=rating,user_ratings_total,name,formatted_address&key=${googleApiKey}`
        );

        if (!response.ok) {
          throw new Error('Erreur lors de l\'appel à Google Places API');
        }

        const data = await response.json();

        if (data.status === 'OK' && data.result) {
          return NextResponse.json({
            rating: data.result.rating || 0,
            reviews_count: data.result.user_ratings_total || 0,
            name: data.result.name,
            address: data.result.formatted_address
          });
        } else {
          return NextResponse.json({ 
            error: data.error_message || 'Erreur Google Places API',
            status: data.status
          }, { status: 400 });
        }
      } catch (error) {
        console.error('Erreur Google Places API:', error);
        return NextResponse.json({ 
          error: 'Erreur lors de la récupération des données Google',
          details: error.message
        }, { status: 500 });
      }
    }

    // Sinon, récupérer depuis la base de données
    if (restaurantId) {
      const { data, error } = await supabase
        .from('restaurants')
        .select('google_place_id, google_rating, google_reviews_count, google_last_updated')
        .eq('id', restaurantId)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
      }

      return NextResponse.json({
        place_id: data.google_place_id,
        rating: data.google_rating,
        reviews_count: data.google_reviews_count,
        last_updated: data.google_last_updated
      });
    }

  } catch (error) {
    console.error('Erreur API Google:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// POST - Mettre à jour les notes Google pour un restaurant
export async function POST(request) {
  try {
    const { restaurant_id, place_id, force_update = false } = await request.json();

    if (!restaurant_id || !place_id) {
      return NextResponse.json({ error: 'restaurant_id et place_id requis' }, { status: 400 });
    }

    const googleApiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!googleApiKey) {
      return NextResponse.json({ 
        error: 'Google Places API key non configurée' 
      }, { status: 500 });
    }

    // Vérifier si une mise à jour est nécessaire (dernière mise à jour > 24h)
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('google_last_updated, google_place_id')
      .eq('id', restaurant_id)
      .single();

    if (!force_update && restaurant?.google_last_updated) {
      const lastUpdate = new Date(restaurant.google_last_updated);
      const now = new Date();
      const hoursSinceUpdate = (now - lastUpdate) / (1000 * 60 * 60);
      
      // Si la mise à jour date de moins de 24h, ne pas refaire l'appel API
      if (hoursSinceUpdate < 24 && restaurant.google_place_id === place_id) {
        return NextResponse.json({ 
          message: 'Données déjà à jour',
          skip_update: true
        });
      }
    }

    // Appel à Google Places API
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place_id}&fields=rating,user_ratings_total&key=${googleApiKey}`
    );

    if (!response.ok) {
      throw new Error('Erreur lors de l\'appel à Google Places API');
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      return NextResponse.json({ 
        error: data.error_message || 'Erreur Google Places API',
        status: data.status
      }, { status: 400 });
    }

    // Mettre à jour la base de données
    const { error: updateError } = await supabase
      .from('restaurants')
      .update({
        google_place_id: place_id,
        google_rating: data.result.rating || null,
        google_reviews_count: data.result.user_ratings_total || 0,
        google_last_updated: new Date().toISOString()
      })
      .eq('id', restaurant_id);

    if (updateError) {
      console.error('Erreur mise à jour restaurant:', updateError);
      return NextResponse.json({ error: 'Erreur lors de la mise à jour' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      rating: data.result.rating,
      reviews_count: data.result.user_ratings_total,
      message: 'Notes Google mises à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API Google POST:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error.message
    }, { status: 500 });
  }
}

