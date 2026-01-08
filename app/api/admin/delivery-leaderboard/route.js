import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle admin requis' },
        { status: 403 }
      );
    }

    // Récupérer tous les livreurs avec leurs statistiques depuis la vue
    const { data: leaderboard, error: leaderboardError } = await supabaseAdmin
      .from('delivery_leaderboard')
      .select('*')
      .order('average_rating', { ascending: false })
      .order('total_deliveries', { ascending: false });

    if (leaderboardError) {
      console.error('Erreur récupération leaderboard:', leaderboardError);
      return NextResponse.json(
        { error: 'Erreur serveur' },
        { status: 500 }
      );
    }

    return NextResponse.json({ leaderboard: leaderboard || [] });
  } catch (error) {
    console.error('Erreur API leaderboard:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

