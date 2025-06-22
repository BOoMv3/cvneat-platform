import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  const { id } = params;

  if (!id) {
    return NextResponse.json({ message: "ID du restaurant manquant" }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('menus')
      .select('*') // Sélectionner toutes les colonnes, y compris "category"
      .eq('restaurant_id', id);

    if (error) {
      console.error('Erreur Supabase lors de la récupération du menu:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération du menu", error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json([]); // Renvoyer un tableau vide si aucun menu n'est trouvé
    }
    
    // Renvoyer les données brutes, le frontend se chargera du reste.
    return NextResponse.json(data);

  } catch (e) {
    console.error('Exception dans l\'API menu:', e);
    return NextResponse.json({ message: "Erreur serveur inattendue", error: e.message }, { status: 500 });
  }
} 