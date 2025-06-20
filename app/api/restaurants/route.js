import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('status', 'active');

  if (error) {
    return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error }, { status: 500 });
  }

  return NextResponse.json(data);
} 