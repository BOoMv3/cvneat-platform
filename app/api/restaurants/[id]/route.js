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

  // Ajouter les valeurs par défaut pour les colonnes manquantes
  const restaurantWithDefaults = {
    ...data,
    frais_livraison: data.frais_livraison || 2.50,
    deliveryTime: data.deliveryTime || 30,
    minOrder: data.minOrder || 15,
    rating: data.rating || 4.5,
    mise_en_avant: data.mise_en_avant || false,
    mise_en_avant_fin: data.mise_en_avant_fin || null
  };

  return NextResponse.json(restaurantWithDefaults);
} 