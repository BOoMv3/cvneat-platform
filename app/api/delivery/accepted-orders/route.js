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

    const role = (userData?.role || '').toString().trim().toLowerCase();
    if (userError || !userData || (role !== 'delivery' && role !== 'livreur')) {
      console.log('❌ Rôle incorrect:', userData?.role, 'pour ID:', user.id);
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    console.log('✅ Rôle livreur confirmé');

    // Récupérer toutes les commandes acceptées par ce livreur
    // NOUVEAU WORKFLOW: Inclure 'en_attente' car le livreur peut accepter avant le restaurant
    // NOTE: La base utilise la colonne livreur_id (delivery_id n'existe pas en production).
    const deliveryOr = `livreur_id.eq.${user.id}`;

    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(id, nom, adresse, telephone, ville, code_postal),
        users(id, nom, prenom, telephone, email)
      `)
      .or(deliveryOr)
      .in('statut', ['en_attente', 'en_preparation', 'en_livraison', 'pret_a_livrer'])
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération commandes acceptées:', error);
      // En cas d'erreur avec les jointures, essayer sans jointures
      const { data: simpleOrders, error: simpleError } = await supabaseAdmin
        .from('commandes')
        .select('*')
        .or(deliveryOr)
        .or(deliveryOr)
        .in('statut', ['en_attente', 'en_preparation', 'en_livraison', 'pret_a_livrer'])
        .order('created_at', { ascending: true });
      
      if (simpleError) {
        console.error('❌ Erreur récupération simple:', simpleError);
        return NextResponse.json({ error: 'Erreur récupération commandes' }, { status: 500 });
      }
      
      return NextResponse.json({ orders: simpleOrders || [] });
    }

    // Enrichir les commandes avec les adresses et informations complètes
    const ordersWithAddresses = await Promise.all((orders || []).map(async (order) => {
      try {
        // D'abord, vérifier si adresse_livraison existe directement dans la commande
        let deliveryAddress = null;
        if (order.adresse_livraison) {
          // Si adresse_livraison existe, l'utiliser
          deliveryAddress = {
            address: order.adresse_livraison,
            city: order.ville_livraison || null,
            postal_code: order.code_postal_livraison || (order.adresse_livraison ? order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
            instructions: order.instructions_livraison || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
          };
        } else {
          // Sinon, chercher dans user_addresses
          const { data: address } = await supabaseAdmin
            .from('user_addresses')
            .select('id, address, city, postal_code, instructions')
            .eq('user_id', order.user_id)
            .single();
          
          deliveryAddress = address || null;
        }
        
        let userProfile = order.users || null;
        if (!userProfile && order.user_id) {
          const { data: fetchedUser } = await supabaseAdmin
            .from('users')
            .select('nom, prenom, telephone, email')
            .eq('id', order.user_id)
            .single();
          userProfile = fetchedUser || null;
        }

        const customerFirstName = order.customer_first_name || userProfile?.prenom || '';
        const customerLastName = order.customer_last_name || userProfile?.nom || '';
        const customerPhone = order.customer_phone || userProfile?.telephone || null;
        const customerEmail = order.customer_email || userProfile?.email || null;

        return {
          ...order,
          user_addresses: deliveryAddress,
          // Ajouter aussi les informations directement accessibles
          adresse_livraison: order.adresse_livraison || deliveryAddress?.address || null,
          ville_livraison: order.ville_livraison || deliveryAddress?.city || null,
          code_postal_livraison: order.code_postal_livraison || deliveryAddress?.postal_code || (order.adresse_livraison ? order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
          instructions_livraison: order.instructions_livraison || deliveryAddress?.instructions || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null,
          customer_name: [customerFirstName, customerLastName].filter(Boolean).join(' ').trim() || customerLastName || 'Client',
          customer_first_name: customerFirstName || null,
          customer_last_name: customerLastName || null,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          delivery_address: order.adresse_livraison || deliveryAddress?.address || null,
          delivery_city: order.ville_livraison || deliveryAddress?.city || null,
          delivery_postal_code: order.code_postal_livraison || deliveryAddress?.postal_code || (order.adresse_livraison ? order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
          delivery_instructions: order.instructions_livraison || deliveryAddress?.instructions || null
        };
      } catch (err) {
        console.warn('⚠️ Erreur récupération adresse pour commande', order.id, err);
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

