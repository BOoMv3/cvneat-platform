import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Créer un nouveau restaurant pour un partenaire
export async function POST(request) {
  try {
    const {
      nom,
      description,
      adresse,
      telephone,
      email,
      image_url,
      temps_livraison = 30,
      frais_livraison = 3.50,
      commande_min = 20.00
    } = await request.json();

    // Validation des données requises
    if (!nom || !adresse || !telephone || !email) {
      return NextResponse.json(
        { error: 'Nom, adresse, téléphone et email sont requis' },
        { status: 400 }
      );
    }

    // Créer le restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert([
        {
          nom,
          description,
          adresse,
          telephone,
          email,
          image_url,
          temps_livraison,
          frais_livraison,
          commande_min,
          rating: 4.5,
          is_active: true
        }
      ])
      .select()
      .single();

    if (restaurantError) {
      console.error('Erreur création restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du restaurant' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      restaurant,
      message: 'Restaurant créé avec succès'
    });

  } catch (error) {
    console.error('Erreur API création restaurant:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// Récupérer les restaurants d'un partenaire
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const partnerId = searchParams.get('partner_id');

    if (!partnerId) {
      return NextResponse.json(
        { error: 'ID du partenaire requis' },
        { status: 400 }
      );
    }

    const { data: restaurants, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('partner_id', partnerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur récupération restaurants:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des restaurants' },
        { status: 500 }
      );
    }

    return NextResponse.json(restaurants || []);

  } catch (error) {
    console.error('Erreur API récupération restaurants:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 