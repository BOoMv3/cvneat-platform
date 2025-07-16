import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !userData.role.includes('delivery')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    // Récupérer les statistiques du livreur
    const { data, error } = await supabase
      .from('delivery_stats')
      .select('*')
      .eq('delivery_id', user.id)
      .single();

    if (error) {
      console.error('Erreur récupération stats livreur:', error);
      // Si la table n'existe pas encore ou aucune donnée, retourner des stats par défaut
      if (error.code === '42P01' || error.code === 'PGRST116') {
        const defaultStats = {
          total_earnings: 0,
          total_deliveries: 0,
          average_rating: 0,
          last_month_earnings: 0,
          total_distance_km: 0,
          total_time_hours: 0
        };
        return NextResponse.json(defaultStats);
      }
      return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
    }

    // Si aucune donnée trouvée, créer une entrée par défaut
    if (!data) {
      const defaultStats = {
        delivery_id: user.id,
        total_earnings: 0,
        total_deliveries: 0,
        average_rating: 0,
        last_month_earnings: 0,
        total_distance_km: 0,
        total_time_hours: 0
      };
      
      const { data: newStats, error: insertError } = await supabase
        .from('delivery_stats')
        .insert(defaultStats)
        .select()
        .single();
        
      if (insertError) {
        console.error('Erreur création stats par défaut:', insertError);
        return NextResponse.json(defaultStats);
      }
      
      return NextResponse.json(newStats);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Erreur API stats livreur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
} 