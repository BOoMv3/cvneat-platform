import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  console.log('API /api/restaurants/[id]/menu appelée avec params:', params);
  try {
    const { id } = params;
    const { data, error } = await supabase
      .from('menus')
      .select('id, nom, description, prix, image_url, disponible, restaurant_id')
      .eq('restaurant_id', id);

    if (error) {
      console.error('Erreur détectée:', error);
      return NextResponse.json({ message: "Erreur lors de la récupération du menu", error: error.message, details: error }, { status: 500 });
    }

    if (!data || !Array.isArray(data)) {
      console.error('Erreur détectée: data vide ou format inattendu', data);
      return NextResponse.json({ message: "Aucune donnée retournée ou format inattendu", data }, { status: 500 });
    }

    const mapped = data.map(item => ({
      id: item.id,
      name: item.nom,
      price: item.prix,
      description: item.description,
      image: item.image_url,
      is_available: item.disponible,
      restaurant_id: item.restaurant_id,
    }));

    return NextResponse.json(mapped);
  } catch (e) {
    console.error('Erreur détectée (catch):', e);
    return NextResponse.json({ message: "Exception serveur", error: e.message, stack: e.stack }, { status: 500 });
  }
} 