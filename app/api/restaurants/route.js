import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, delivery_fee as frais_livraison')
    .eq('status', 'active');

  if (error) {
    console.error('Erreur Supabase lors de la récupération des restaurants:', error);
    return NextResponse.json({ message: "Erreur lors de la récupération des restaurants", error: error.message }, { status: 500 });
  }

  // Plus besoin de mapper, les données sont déjà au bon format
  return NextResponse.json(data || []);
} 