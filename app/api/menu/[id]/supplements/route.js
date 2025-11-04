import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID de menu requis' },
        { status: 400 }
      );
    }

    // D'abord, essayer de récupérer les suppléments depuis la colonne supplements de menus
    const { data: menuItem, error: menuError } = await supabase
      .from('menus')
      .select('supplements')
      .eq('id', id)
      .single();

    if (!menuError && menuItem && menuItem.supplements) {
      // Parser les suppléments si c'est une string JSON
      let supplements = [];
      if (typeof menuItem.supplements === 'string') {
        try {
          supplements = JSON.parse(menuItem.supplements);
        } catch (e) {
          console.warn('Erreur parsing supplements string:', e);
          supplements = [];
        }
      } else if (Array.isArray(menuItem.supplements)) {
        supplements = menuItem.supplements;
      }

      if (supplements.length > 0) {
        // Formater pour correspondre au format attendu
        const formattedSupplements = supplements.map((sup, idx) => ({
          id: sup.id || `supp-${idx}`,
          nom: sup.nom || sup.name || 'Supplément',
          name: sup.nom || sup.name || 'Supplément',
          prix: parseFloat(sup.prix || sup.price || 0),
          price: parseFloat(sup.prix || sup.price || 0),
          description: sup.description || '',
          disponible: sup.disponible !== false,
          ordre: sup.ordre || idx
        }));
        return NextResponse.json(formattedSupplements);
      }
    }

    // Fallback : essayer la table menu_supplements (si elle existe)
    const { data: supplements, error } = await supabase
      .from('menu_supplements')
      .select('*')
      .eq('menu_item_id', id)
      .eq('disponible', true)
      .order('ordre');

    if (!error && supplements && supplements.length > 0) {
      return NextResponse.json(supplements);
    }

    // Si aucune erreur mais pas de données, retourner un tableau vide
    return NextResponse.json([]);

  } catch (error) {
    console.error('Erreur API suppléments:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 