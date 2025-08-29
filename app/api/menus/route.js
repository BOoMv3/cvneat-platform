import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: menus, error } = await supabase
      .from('menus')
      .select('*')
      .eq('disponible', true);

    if (error) {
      console.error('Erreur récupération menus:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json(menus || []);
  } catch (error) {
    console.error('Erreur API menus:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    
    const { data, error } = await supabase
      .from('menus')
      .insert([body])
      .select();

    if (error) {
      console.error('Erreur création menu:', error);
      return NextResponse.json({ error: 'Erreur création menu' }, { status: 500 });
    }

    return NextResponse.json(data[0]);
  } catch (error) {
    console.error('Erreur API menus POST:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 