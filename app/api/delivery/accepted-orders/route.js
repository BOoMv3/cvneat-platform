import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    console.log('🔍 API accepted-orders appelée');
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
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

    // Récupérer toutes les commandes acceptées par ce livreur
    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(id, nom, adresse, telephone, ville, code_postal),
        users(id, nom, prenom, telephone, email)
      `)
      .eq('livreur_id', user.id)
      .in('statut', ['en_preparation', 'en_livraison', 'pret_a_livrer'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération commandes acceptées:', error);
      // En cas d'erreur avec les jointures, essayer sans jointures
      const { data: simpleOrders, error: simpleError } = await supabaseAdmin
        .from('commandes')
        .select('*')
        .eq('livreur_id', user.id)
        .in('statut', ['en_preparation', 'en_livraison', 'pret_a_livrer'])
        .order('created_at', { ascending: true });
      
      if (simpleError) {
        console.error('❌ Erreur récupération simple:', simpleError);
        return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
      }
      
      return NextResponse.json({ orders: simpleOrders || [] });
    }

    // Récupérer les adresses séparément pour éviter les problèmes de jointure
    const ordersWithAddresses = await Promise.all((orders || []).map(async (order) => {
      try {
        const { data: address } = await supabaseAdmin
          .from('user_addresses')
          .select('id, address, city, postal_code, delivery_instructions')
          .eq('user_id', order.user_id)
          .single();
        
        return {
          ...order,
          user_addresses: address || null
        };
      } catch (err) {
        return {
          ...order,
          user_addresses: null
        };
      }
    }));

    console.log('✅ Commandes acceptées récupérées:', ordersWithAddresses.length);
    return NextResponse.json({ orders: ordersWithAddresses });
  } catch (error) {
    console.error('❌ Erreur API accepted-orders:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

