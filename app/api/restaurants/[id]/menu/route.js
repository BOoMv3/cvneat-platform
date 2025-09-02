import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const { data: menuItems, error } = await supabase
      .from('menu_items')
      .select(`
        *,
        categories(name)
      `)
      .eq('restaurant_id', id)
      .eq('is_available', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Transformer les données pour correspondre au format attendu par le frontend
    const transformedMenu = menuItems?.map(item => ({
      id: item.id,
      nom: item.name,
      description: item.description,
      prix: item.price,
      image_url: item.image,
      category: item.categories?.name || 'Autres',
      disponible: item.is_available,
      created_at: item.created_at
    })) || [];

    return NextResponse.json(transformedMenu);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}