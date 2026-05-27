import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// API pour récupérer les notifications pour les livreurs
export async function GET(request) {
  try {
    console.log('🔔 API notifications livreur appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    console.log('🔑 Token présent:', !!token);
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      console.log('❌ Pas d\'utilisateur connecté');
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    console.log('✅ Utilisateur connecté:', user.email);

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que l'utilisateur est un livreur (par ID pour plus de fiabilité)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour ID:', user.id);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Récupérer les notifications (commandes disponibles)
    const { data: notifications, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, frais_livraison)
      `)
      .in('statut', ['pret_a_livrer', 'en_preparation'])
      .is('livreur_id', null)
      // Exclure les retraits sur place: seuls les commandes livraison doivent notifier les livreurs.
      .or('order_fulfillment.is.null,order_fulfillment.eq.delivery')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération notifications:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    console.log('✅ Notifications récupérées:', notifications?.length || 0);
    
    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      count: notifications?.length || 0
    });
  } catch (error) {
    console.error('❌ Erreur API notifications:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}