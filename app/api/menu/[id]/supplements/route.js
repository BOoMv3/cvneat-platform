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

    // Récupérer les suppléments disponibles pour cet item de menu
    const { data: supplements, error } = await supabase
      .from('menu_supplements')
      .select('*')
      .eq('menu_item_id', id)
      .eq('disponible', true)
      .order('ordre');

    if (error) {
      console.error('Erreur Supabase:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des suppléments' },
        { status: 500 }
      );
    }

    return NextResponse.json(supplements || []);

  } catch (error) {
    console.error('Erreur API suppléments:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
} 