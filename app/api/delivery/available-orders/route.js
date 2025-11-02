import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    console.log('🔍 API available-orders appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    // Token vérifié (non loggé pour des raisons de sécurité)
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Vérifier que l'utilisateur est un livreur (par email)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour email:', user.email);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer les commandes disponibles pour livraison
    // IMPORTANT: La contrainte CHECK n'autorise que: 'en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'
    // Les livreurs voient uniquement les commandes:
    // - avec statut='en_preparation' (restaurant a accepté et marqué comme prête)
    // - avec ready_for_delivery=true (restaurant a marqué "prêt à livrer")
    // - avec livreur_id null (pas encore assignées)
    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, frais_livraison)
      `)
      .eq('statut', 'en_preparation') // Commandes en préparation
      .eq('ready_for_delivery', true) // SEULEMENT celles marquées comme prêtes par le restaurant
      .is('livreur_id', null) // Pas encore assignées à un livreur
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Erreur serveur', 
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ Commandes récupérées:', orders?.length || 0);
    console.log('✅ Détails commandes:', orders);
    return NextResponse.json(orders || []);
  } catch (error) {
    console.error('❌ Erreur API commandes disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 