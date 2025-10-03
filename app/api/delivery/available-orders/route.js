import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

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

    // Récupérer les commandes disponibles pour livraison
    // Les livreurs voient les commandes prêtes ET en préparation (pour voir le décompte)
    const { data: orders, error } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone)
      `)
      .in('statut', ['pret_a_livrer', 'en_preparation']) // Commandes prêtes ET en préparation
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