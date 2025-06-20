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

  return NextResponse.json(data);
} 