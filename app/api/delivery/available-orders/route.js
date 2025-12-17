import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cleanupExpiredOrders } from '../../../../lib/orderCleanup';

export async function GET(request) {
  try {
    console.log('🔍 API available-orders appelée');
    
    // Nettoyer les commandes expirées en arrière-plan (non bloquant)
    cleanupExpiredOrders().catch(err => {
      console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    });
    
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
    // NOUVEAU WORKFLOW: Les livreurs voient les commandes en statut 'en_attente' (AVANT l'acceptation restaurant)
    // - avec statut='en_attente' (commande créée, en attente de livreur)
    // - avec livreur_id null (pas encore assignées)
    // - avec payment_status='paid' ou 'succeeded' (paiement validé)
    // Les livreurs doivent accepter AVANT que le restaurant puisse préparer la commande
    const { data: orders, error } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(nom, adresse, telephone, frais_livraison),
        users(id, nom, prenom, telephone, email)
      `)
      .eq('statut', 'en_attente') // Commandes en attente (nouveau workflow: livreur d'abord)
      .is('livreur_id', null) // Pas encore assignées à un livreur
      .in('payment_status', ['paid', 'succeeded']) // Paiement validé
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erreur récupération commandes:', error);
      console.error('❌ Détails erreur:', JSON.stringify(error, null, 2));
      return NextResponse.json({ 
        error: 'Erreur serveur', 
        details: error.message 
      }, { status: 500 });
    }

    // Enrichir les commandes avec les adresses et informations complètes
    const ordersWithDetails = await Promise.all((orders || []).map(async (order) => {
      try {
        // Récupérer l'adresse de livraison
        let deliveryAddress = null;
        if (order.adresse_livraison) {
          deliveryAddress = {
            address: order.adresse_livraison,
            city: order.ville_livraison || null,
            postal_code: order.code_postal_livraison || (order.adresse_livraison ? order.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
            instructions: order.instructions_livraison || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
          };
        } else if (order.user_id) {
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
          // Ajouter les informations directement accessibles
          adresse_livraison: order.adresse_livraison || deliveryAddress?.address || null,
          ville_livraison: order.ville_livraison || deliveryAddress?.city || null,
          code_postal_livraison: order.code_postal_livraison || deliveryAddress?.postal_code || null,
          instructions_livraison: order.instructions_livraison || deliveryAddress?.instructions || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null,
          // Informations client pour compatibilité
          customer_name: [customerFirstName, customerLastName].filter(Boolean).join(' ').trim() || customerLastName || 'Client',
          customer_first_name: customerFirstName || null,
          customer_last_name: customerLastName || null,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          delivery_address: order.adresse_livraison || deliveryAddress?.address || null,
          delivery_city: order.ville_livraison || deliveryAddress?.city || null,
          delivery_postal_code: order.code_postal_livraison || deliveryAddress?.postal_code || null,
          delivery_instructions: order.instructions_livraison || deliveryAddress?.instructions || (order.adresse_livraison ? (order.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
        };
      } catch (err) {
        console.warn('⚠️ Erreur enrichissement commande', order.id, err);
        return order;
      }
    }));

    console.log('✅ Commandes récupérées:', ordersWithDetails?.length || 0);
    return NextResponse.json(ordersWithDetails || []);
  } catch (error) {
    console.error('❌ Erreur API commandes disponibles:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
} 