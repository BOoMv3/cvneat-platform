import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sanitizeOrderAmountsForLivreur } from '../../../../lib/livreur-delivery-earnings';

export async function GET(request) {
  try {
    console.log('🔍 API my-orders appelée');
    
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

    // Récupérer les commandes acceptées par ce livreur
    // NOUVEAU WORKFLOW: Le livreur doit voir ses commandes dès qu'il les accepte, 
    // quel que soit le statut (en_attente, en_preparation, pret_a_livrer, en_livraison, livree)
    // NOTE: La base utilise la colonne livreur_id (delivery_id n'existe pas en production).
    const deliveryOr = `livreur_id.eq.${user.id}`;

    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, frais_livraison),
        users(id, nom, prenom, telephone, email)
      `)
      .or(deliveryOr) // Commandes assignées à ce livreur (ancienne + nouvelle colonne)
      .neq('statut', 'annulee') // Ne pas afficher les commandes annulées
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const enrichedOrders = (orders || []).map(order => {
      const deliveryAddress = order.adresse_livraison || order.delivery_address || null;
      const deliveryCity = order.ville_livraison || order.delivery_city || null;
      // Extraire le code postal de l'adresse si pas disponible directement
      const deliveryPostal = order.code_postal_livraison || order.delivery_postal_code || (order.adresse_livraison ? order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null;
      return sanitizeOrderAmountsForLivreur({
        ...order,
        customer_name: order.users?.prenom && order.users?.nom
          ? `${order.users.prenom} ${order.users.nom}`
          : order.users?.nom || 'Client',
        customer_phone: order.users?.telephone || null,
        customer_email: order.users?.email || null,
        delivery_address: deliveryAddress,
        delivery_city: deliveryCity,
        delivery_postal_code: deliveryPostal,
        delivery_instructions: order.instructions_livraison || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
      });
    });

    console.log('✅ Commandes trouvées:', enrichedOrders.length || 0);
    return NextResponse.json(enrichedOrders);
  } catch (error) {
    console.error('❌ Erreur API mes commandes:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}