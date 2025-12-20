import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { cleanupExpiredOrders } from '../../../../../lib/orderCleanup';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const body = await request.json().catch(() => ({}));
    const { delivery_time } = body;
    console.log('🔍 API accept-order appelée pour commande:', orderId, 'delivery_time:', delivery_time);
    
    // Nettoyer les commandes expirées en arrière-plan (non bloquant)
    cleanupExpiredOrders().catch(err => {
      console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    });
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est un livreur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('email', user.email)
      .single();

    if (userError || !userData || userData.role !== 'delivery') {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403 });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Vérifier que la commande existe et est disponible
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('❌ Commande introuvable:', orderId, orderError);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      statut: order.statut,
      livreur_id: order.livreur_id,
      restaurant_id: order.restaurant_id
    });

    // VÉRIFICATION CRITIQUE: Bloquer si la commande est déjà annulée ou remboursée
    if (order.statut === 'annulee' || order.payment_status === 'refunded') {
      console.log('❌ Tentative d\'acceptation d\'une commande annulée ou remboursée:', { orderId, statut: order.statut, payment: order.payment_status });
      return NextResponse.json({ 
        error: 'Cette commande a été annulée ou remboursée et n\'est plus disponible',
        statut: order.statut,
        payment_status: order.payment_status
      }, { status: 400 });
    }

    // Vérifier que la commande n'est pas déjà acceptée par un autre livreur
    if (order.livreur_id && order.livreur_id !== user.id) {
      return NextResponse.json({ error: 'Commande déjà acceptée par un autre livreur' }, { status: 409 });
    }

    // Vérifier que la commande est dans un statut acceptable
    // NOUVEAU WORKFLOW: Les livreurs peuvent accepter les commandes 'en_attente', 'en_preparation' ou 'pret_a_livrer'
    // - Si 'en_attente': livreur_id est assigné, statut reste 'en_attente' (le resto accepte ensuite)
    // - Si 'en_preparation' ou 'pret_a_livrer': livreur_id est assigné, statut passe à 'en_livraison'
    const allowedStatuses = ['en_attente', 'en_preparation', 'pret_a_livrer'];
    if (!allowedStatuses.includes(order.statut)) {
      console.log('❌ Statut commande non acceptable pour livreur:', order.statut);
      return NextResponse.json({ 
        error: 'Commande non disponible pour livraison', 
        details: `Statut actuel: ${order.statut}. Seules les commandes en attente, en préparation ou prêtes peuvent être acceptées.` 
      }, { status: 400 });
    }

    // Vérifier que le paiement est validé
    if (!['paid', 'succeeded'].includes(order.payment_status)) {
      console.log('❌ Paiement non validé:', order.payment_status);
      return NextResponse.json({ 
        error: 'Commande non disponible', 
        details: 'Le paiement n\'a pas été validé.' 
      }, { status: 400 });
    }

    // Déterminer le nouveau statut
    // Si la commande était déjà en préparation ou prête, on peut la passer en livraison
    let nextStatus = order.statut;
    if (order.statut === 'en_preparation' || order.statut === 'pret_a_livrer') {
      nextStatus = 'en_livraison';
    }

    // Accepter la commande
    console.log('📤 Acceptation commande par livreur:', {
      orderId,
      livreur_id: user.id,
      oldStatut: order.statut,
      newStatut: nextStatus
    });
    
    const updatePayload = {
      livreur_id: user.id,
      statut: nextStatus,
      updated_at: new Date().toISOString()
    };

    // Ajouter le temps de livraison si fourni et valide
    if (delivery_time && delivery_time >= 5 && delivery_time <= 60) {
      updatePayload.delivery_time = delivery_time;
    }

    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update(updatePayload)
      .eq('id', orderId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur acceptation commande:', updateError);
      console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
      return NextResponse.json({ error: 'Erreur acceptation commande' }, { status: 500 });
    }

    console.log('✅ Commande acceptée par livreur:', user.email);
    console.log('✅ Commande mise à jour:', {
      id: updatedOrder.id,
      statut: updatedOrder.statut,
      livreur_id: updatedOrder.livreur_id
    });

    const { data: enrichedOrder } = await supabaseAdmin
      .from('commandes')
      .select(`
        *,
        restaurant:restaurants(id, nom, adresse, telephone, ville, code_postal),
        users(id, nom, prenom, telephone, email)
      `)
      .eq('id', orderId)
      .single();

    let deliveryAddress = null;
    if (enrichedOrder) {
      if (enrichedOrder.adresse_livraison) {
        deliveryAddress = {
          address: enrichedOrder.adresse_livraison,
          city: enrichedOrder.ville_livraison || null,
          postal_code: enrichedOrder.code_postal_livraison || (enrichedOrder.adresse_livraison ? enrichedOrder.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
          delivery_instructions: enrichedOrder.instructions_livraison || (enrichedOrder.adresse_livraison ? (enrichedOrder.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
        };
      } else if (enrichedOrder.user_id) {
        const { data: address } = await supabaseAdmin
          .from('user_addresses')
          .select('id, address, city, postal_code, instructions')
          .eq('user_id', enrichedOrder.user_id)
          .single();
        deliveryAddress = address || null;
      }
    }

    let userProfile = enrichedOrder?.users || null;
    if (!userProfile && enrichedOrder?.user_id) {
      const { data: fetchedUser } = await supabaseAdmin
        .from('users')
        .select('nom, prenom, telephone, email')
        .eq('id', enrichedOrder.user_id)
        .single();
      userProfile = fetchedUser || null;
    }

    const formattedOrder = enrichedOrder
      ? {
          ...enrichedOrder,
          user_addresses: deliveryAddress,
          adresse_livraison: enrichedOrder.adresse_livraison || deliveryAddress?.address || null,
          ville_livraison: enrichedOrder.ville_livraison || deliveryAddress?.city || null,
          code_postal_livraison: enrichedOrder.code_postal_livraison || deliveryAddress?.postal_code || (enrichedOrder.adresse_livraison ? enrichedOrder.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
          instructions_livraison: enrichedOrder.instructions_livraison || deliveryAddress?.instructions || (enrichedOrder.adresse_livraison ? (enrichedOrder.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null,
          customer_name: [
            enrichedOrder.customer_first_name || userProfile?.prenom || '',
            enrichedOrder.customer_last_name || userProfile?.nom || ''
          ]
            .filter(Boolean)
            .join(' ')
            .trim() || enrichedOrder.customer_last_name || userProfile?.nom || 'Client',
          customer_first_name: enrichedOrder.customer_first_name || userProfile?.prenom || null,
          customer_last_name: enrichedOrder.customer_last_name || userProfile?.nom || null,
          customer_phone: enrichedOrder.customer_phone || userProfile?.telephone || null,
          customer_email: enrichedOrder.customer_email || userProfile?.email || null,
          delivery_address: enrichedOrder.adresse_livraison || deliveryAddress?.address || null,
          delivery_city: enrichedOrder.ville_livraison || deliveryAddress?.city || null,
          delivery_postal_code: enrichedOrder.code_postal_livraison || deliveryAddress?.postal_code || (enrichedOrder.adresse_livraison ? enrichedOrder.adresse_livraison.match(/\b(\d{5})\b/)?.[1] : null) || null,
          delivery_instructions: enrichedOrder.instructions_livraison || deliveryAddress?.instructions || (enrichedOrder.adresse_livraison ? (enrichedOrder.adresse_livraison.match(/\(Instructions:\s*(.+?)\)/)?.[1]?.trim() || null) : null) || null
        }
      : updatedOrder;

    // Dans le nouveau workflow, on n'envoie pas d'email "en livraison" tout de suite
    // car le restaurant doit encore préparer la commande.
    // L'email sera envoyé plus tard quand le livreur récupère vraiment la commande.

    return NextResponse.json({
      success: true,
      message: 'Commande acceptée avec succès',
      order: formattedOrder
    });
  } catch (error) {
    console.error('❌ Erreur API accept-order:', error);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error.message || 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}