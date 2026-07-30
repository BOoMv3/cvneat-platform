import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../../../lib/supabase';
import { isAdminViewerRole, isAdminWriterRole } from '@/lib/admin-viewer';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Route pour nettoyer les commandes expirées sans livreur
// À appeler périodiquement (ex: toutes les minutes via Vercel Cron ou un job externe)
export async function POST(request) {
  try {
    // Vérifier que la requête vient de Vercel Cron (via le header X-Vercel-Cron)
    // Si la variable d'environnement CLEANUP_API_KEY est définie, l'utiliser aussi comme option de sécurité
    const cronHeader = request.headers.get('x-vercel-cron');
    const authHeader = request.headers.get('authorization');
    const cleanupApiKey = process.env.CLEANUP_API_KEY;
    
    // Accepter si c'est un cron Vercel OU si la clé API correspond
    if (!cronHeader && cleanupApiKey && authHeader !== `Bearer ${cleanupApiKey}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('🧹 Nettoyage des commandes expirées sans livreur...');

    // Appeler la fonction SQL pour nettoyer les commandes expirées
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_orders');

    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return NextResponse.json({ error: 'Erreur lors du nettoyage' }, { status: 500 });
    }

    const cancelledCount = data && data.length > 0 ? data[0].cancelled_count : 0;

    console.log(`✅ Nettoyage terminé: ${cancelledCount} commande(s) annulée(s)`);

    return NextResponse.json({
      success: true,
      cancelled_count: cancelledCount,
      message: `${cancelledCount} commande(s) expirée(s) annulée(s)`
    });

  } catch (error) {
    console.error('❌ Erreur API cleanup-expired-orders:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du nettoyage' },
      { status: 500 }
    );
  }
}

// GET - Pour tester manuellement
export async function GET(request) {
  try {
    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !isAdminWriterRole(userData.role)) {
      return NextResponse.json({ error: 'Accès refusé - Admin requis' }, { status: 403 });
    }

    // Appeler la fonction SQL pour nettoyer les commandes expirées
    const { data, error } = await supabaseAdmin.rpc('cleanup_expired_orders');

    if (error) {
      console.error('❌ Erreur lors du nettoyage:', error);
      return NextResponse.json({ error: 'Erreur lors du nettoyage' }, { status: 500 });
    }

    const cancelledCount = data && data.length > 0 ? data[0].cancelled_count : 0;

    return NextResponse.json({
      success: true,
      cancelled_count: cancelledCount,
      message: `${cancelledCount} commande(s) expirée(s) annulée(s)`
    });

  } catch (error) {
    console.error('❌ Erreur API cleanup-expired-orders:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du nettoyage' },
      { status: 500 }
    );
  }
}

