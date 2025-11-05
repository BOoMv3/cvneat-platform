import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    // Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier le rôle admin
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 });
    }

    // Compter les données
    const [commandesResult, detailsResult, livraisonsResult, reclamationsResult] = await Promise.all([
      supabaseAdmin.from('commandes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('details_commande').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('livraisons').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 })),
      supabaseAdmin.from('reclamations').select('id', { count: 'exact', head: true }).catch(() => ({ count: 0 }))
    ]);

    return NextResponse.json({
      commandes: commandesResult.count || 0,
      details_commande: detailsResult.count || 0,
      livraisons: livraisonsResult.count || 0,
      reclamations: reclamationsResult.count || 0
    });
  } catch (error) {
    console.error('Erreur récupération stats:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

