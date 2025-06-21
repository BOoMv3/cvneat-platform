import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    // Pour l'instant, on simule l'ID du livreur
    const deliveryId = 'current-user-id'; // À remplacer par l'ID réel

    // Récupérer les statistiques du livreur
    const { data: stats, error } = await supabase
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', deliveryId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur récupération stats livreur:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la récupération des statistiques' },
        { status: 500 }
      );
    }

    // Si pas de stats, créer des stats par défaut
    if (!stats) {
      const { data: newStats, error: createError } = await supabase
        .from('delivery_stats')
        .insert({
          delivery_id: deliveryId,
          total_deliveries: 0,
          total_earnings: 0,
          rating: 0,
          is_available: true
        })
        .select()
        .single();

      if (createError) {
        console.error('Erreur création stats:', createError);
        return NextResponse.json(
          { error: 'Erreur lors de la création des statistiques' },
          { status: 500 }
        );
      }

      return NextResponse.json(newStats);
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 