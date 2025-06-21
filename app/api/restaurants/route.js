import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, nom, description, adresse, telephone, email, type_cuisine, image_url, status')
    .eq('status', 'active');

  if (error) {
    console.error('Erreur Supabase lors de la récupération des restaurants:', error);
    return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
  }

  // Ajouter les valeurs par défaut pour les colonnes manquantes
  const restaurantsWithDefaults = data.map(restaurant => ({
    ...restaurant,
    frais_livraison: 2.50, // Valeur par défaut
    deliveryTime: 30, // Temps de livraison par défaut en minutes
    minOrder: 15, // Commande minimum par défaut
    rating: 4.5, // Note par défaut
    mise_en_avant: false, // Pas de mise en avant par défaut
    mise_en_avant_fin: null
  }));

  return NextResponse.json(restaurantsWithDefaults);
} 