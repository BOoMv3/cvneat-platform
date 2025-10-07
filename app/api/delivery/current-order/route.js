import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    console.log('🔍 API current-order appelée');
    
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

    // Vérifier que l'utilisateur est un livreur
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

    // Récupérer la commande actuelle acceptée par ce livreur (statut 'accepted')
    const { data: order, error } = await supabase
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone)
      `)
      .eq('delivery_id', user.id) // Commandes assignées à ce livreur
      .eq('status', 'accepted') // Seulement les commandes acceptées (pas encore livrées)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Erreur récupération commande actuelle:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    console.log('✅ Commande actuelle trouvée:', !!order);
    
    if (order) {
      return NextResponse.json({
        hasOrder: true,
        order: order
      });
    } else {
      return NextResponse.json({
        hasOrder: false,
        order: null
      });
    }
  } catch (error) {
    console.error('❌ Erreur API current-order:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}