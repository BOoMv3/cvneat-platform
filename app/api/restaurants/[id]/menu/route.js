import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .eq('restaurant_id', id)
      .eq('disponible', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    // Transformer les données pour correspondre au format attendu par le frontend
    const transformedMenu = menus?.map(item => {
      // Parser les suppléments si présents (JSONB ou string)
      let supplements = [];
      if (item.supplements) {
        if (typeof item.supplements === 'string') {
          try {
            supplements = JSON.parse(item.supplements);
          } catch (e) {
            console.warn('Erreur parsing supplements string:', e);
            supplements = [];
          }
        } else if (Array.isArray(item.supplements)) {
          supplements = item.supplements;
        }
      }
      
      return {
        id: item.id,
        nom: item.nom,
        description: item.description,
        prix: item.prix,
        image_url: item.image_url,
        category: item.category || 'Autres',
        disponible: item.disponible,
        created_at: item.created_at,
        supplements: supplements // Inclure les suppléments
      };
    }) || [];

    return NextResponse.json(transformedMenu);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}