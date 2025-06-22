import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // NOTE: La table delivery_stats doit être créée pour que cette route fonctionne.
    // En attendant, nous renvoyons des données par défaut pour ne pas bloquer le build.
    const defaultStats = {
      total_earnings: 0,
      total_deliveries: 0,
      average_rating: 0,
      last_month_earnings: 0
    };
    return NextResponse.json(defaultStats);

    /*
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', user.id)
      .single();

    if (error) {
      console.error('Erreur récupération stats livreur:', error);
      // Retourner des stats par défaut si la table ou l'entrée n'existe pas
      if (error.code === '42P01' || error.code === 'PGRST116') {
        const defaultStats = {
          total_earnings: 0,
          total_deliveries: 0,
          average_rating: 0,
          last_month_earnings: 0
        };
        return NextResponse.json(defaultStats);
      }
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    return NextResponse.json(data);
    */
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 