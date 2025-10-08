import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

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

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer la commande actuelle acceptée par ce livreur (statut 'en_livraison')
    const { data: order, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, frais_livraison),
        users(prenom, nom, telephone),
        user_addresses(address, city, postal_code),
        details_commande(
          id,
          plat_id,
          quantite,
          prix_unitaire,
          menus(nom, prix)
        )
      `)
      .eq('livreur_id', user.id) // Commandes assignées à ce livreur
      .eq('statut', 'en_livraison') // Seulement les commandes en livraison (pas encore livrées)
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