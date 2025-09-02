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
      .order('categorie', { ascending: true });

    if (error) {
      console.error('Erreur récupération menu:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json(menus || []);
  } catch (error) {
    console.error('Erreur API menu:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}