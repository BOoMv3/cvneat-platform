import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import sseBroadcaster from '../../../../../lib/sse-broadcast';
// DÉSACTIVÉ: Remboursements automatiques désactivés
// import { cleanupExpiredOrders } from '../../../../../lib/orderCleanup';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
};

export async function OPTIONS() {
  // Nécessaire pour WKWebView/Capacitor: les requêtes POST avec Authorization déclenchent un preflight
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    const body = await request.json().catch(() => ({}));
    const { delivery_time } = body;
    console.log('🔍 API accept-order appelée pour commande:', orderId, 'delivery_time:', delivery_time);
    
    // DÉSACTIVÉ: Nettoyage automatique des commandes expirées (remboursements automatiques désactivés)
    // cleanupExpiredOrders().catch(err => {
    //   console.warn('⚠️ Erreur nettoyage commandes expirées (non bloquant):', err);
    // });
    
    // Récupérer le token depuis les cookies ou headers
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;
    
    const { data: { user } } = await supabase.auth.getUser(token);
    
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401, headers: corsHeaders });
    }

    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const normalizeRole = (r) => (r || '').toString().trim().toLowerCase();
    // Vérifier que l'utilisateur est un livreur (tolérer 'delivery' / 'livreur')
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = normalizeRole(userData?.role);
    if (userError || !userData || (role !== 'delivery' && role !== 'livreur')) {
      return NextResponse.json({ error: 'Accès refusé - Rôle livreur requis' }, { status: 403, headers: corsHeaders });
    }

    // Vérifier que la commande existe et est disponible
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.log('❌ Commande introuvable:', orderId, orderError);
      return NextResponse.json({ error: 'Commande introuvable' }, { status: 404, headers: corsHeaders });
    }

    console.log('✅ Commande trouvée:', {
      id: order.id,
      statut: order.statut,
      livreur_id: order.livreur_id,
      restaurant_id: order.restaurant_id,
      order_fulfillment: order.order_fulfillment,
      ready_for_delivery: order.ready_for_delivery,
      payment_status: order.payment_status
    });

    if (String(order.order_fulfillment || 'delivery').toLowerCase() === 'pickup') {
      return NextResponse.json(
        { error: 'Cette commande est en retrait sur place et ne nécessite pas de livreur.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // VÉRIFICATION CRITIQUE: Bloquer si la commande est déjà annulée ou remboursée
    if (order.statut === 'annulee' || order.payment_status === 'refunded') {
      console.log('❌ Tentative d\'acceptation d\'une commande annulée ou remboursée:', { 
        orderId, 
        statut: order.statut, 
        payment: order.payment_status 
      });
      return NextResponse.json({ 
        error: 'Cette commande a été annulée ou remboursée et n\'est plus disponible',
        statut: order.statut,
        payment_status: order.payment_status
      }, { status: 400, headers: corsHeaders });
    }

    // Vérifier que la commande n'est pas déjà acceptée par un autre livreur
    if (order.livreur_id && order.livreur_id !== user.id) {
      console.log('❌ Commande déjà acceptée par un autre livreur:', {
        order_livreur_id: order.livreur_id,
        current_user_id: user.id
      });
      return NextResponse.json({ error: 'Commande déjà acceptée par un autre livreur' }, { status: 409, headers: corsHeaders });
    }

    // Si le livreur a déjà accepté cette commande, permettre la réacceptation (pour rafraîchir)
    if (order.livreur_id === user.id) {
      console.log('✅ Livreur réaccepte sa propre commande, mise à jour autorisée');
    }

    // WORKFLOW: D'abord le livreur accepte (statut 'en_attente'), puis le restaurant accepte
    // Les livreurs peuvent accepter les commandes 'en_attente' uniquement
    // Log détaillé pour debug
    console.log('🔍 Vérification statut et paiement:', {
      statut: order.statut,
      payment_status: order.payment_status,
      livreur_id: order.livreur_id,
      user_id: user.id,
      order_id: order.id,
      statut_ok: order.statut === 'en_attente',
      payment_ok: order.payment_status && ['paid', 'succeeded'].includes(order.payment_status)
    });

    if (order.statut !== 'en_attente') {
      console.log('❌ Statut commande non acceptable pour livreur:', {
        statut: order.statut,
        livreur_id: order.livreur_id,
        user_id: user.id,
        expected: 'en_attente',
        order_id: order.id,
        payment_status: order.payment_status
      });
      return NextResponse.json({ 
        error: 'Commande non disponible pour livraison', 
        details: `Statut actuel: ${order.statut}. Seules les commandes en attente (en_attente) peuvent être acceptées par un livreur.` 
      }, { status: 400, headers: corsHeaders });
    }

    // Vérifier que le paiement est validé - UNIQUEMENT les paiements confirmés
    if (!order.payment_status || !['paid', 'succeeded'].includes(order.payment_status)) {
      console.log('❌ Paiement non validé:', {
        payment_status: order.payment_status,
        order_id: order.id,
        required_statuses: ['paid', 'succeeded'],
        statut: order.statut
      });
      return NextResponse.json({ 
        error: 'Commande non disponible', 
        details: `Le paiement n'a pas été validé (statut: ${order.payment_status || 'non défini'}). Seuls les paiements confirmés (paid, succeeded) peuvent être acceptés.` 
      }, { status: 400, headers: corsHeaders });
    }

    // Accepter la commande
    // Le livreur accepte la commande en assignant son ID
    // Le statut reste 'en_attente' jusqu'à ce que le restaurant accepte
    console.log('📤 Mise à jour commande:', {
      orderId,
      livreur_id: user.id,
      statut_actuel: order.statut,
      nouveau_statut: 'en_attente' // On garde le statut en_attente, le restaurant acceptera après
    });
    
    const updatePayload = {
      livreur_id: user.id,
      updated_at: new Date().toISOString()
      // Le statut reste 'en_attente', le restaurant changera le statut quand il acceptera
    };
    
    // Ajouter delivery_time si fourni par le livreur (seulement si la valeur est valide)
    // Note: Si la colonne n'existe pas encore en base, cette ligne sera ignorée silencieusement
    if (delivery_time !== null && delivery_time !== undefined && delivery_time > 0) {
      updatePayload.delivery_time = delivery_time;
      console.log('📦 Temps de livraison ajouté:', delivery_time, 'minutes');
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
      return NextResponse.json({ error: 'Erreur acceptation commande' }, { status: 500, headers: corsHeaders });
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

    // Note: L'email sera envoyé plus tard, quand le restaurant marque la commande comme prête
    // et que le livreur commence la livraison (statut passe à 'en_livraison')

    // NOUVEAU WORKFLOW: notifier le restaurant UNIQUEMENT quand un livreur accepte.
    try {
      const origin = new URL(request.url).origin;
      const notificationTotal = (
        parseFloat(updatedOrder.total || 0) + parseFloat(updatedOrder.frais_livraison || 0)
      ).toFixed(2);

      // SSE (web resto)
      if (updatedOrder.restaurant_id) {
        sseBroadcaster.broadcast(updatedOrder.restaurant_id, {
          type: 'new_order',
          message: `Nouvelle commande (livreur assigné) #${updatedOrder.id?.slice(0, 8) || 'N/A'} - ${notificationTotal}€`,
          order: updatedOrder,
          timestamp: new Date().toISOString(),
        });

        // Push resto
        const { data: rest } = await supabaseAdmin
          .from('restaurants')
          .select('user_id')
          .eq('id', updatedOrder.restaurant_id)
          .maybeSingle();

        if (rest?.user_id) {
          await fetch(`${origin}/api/notifications/send-push`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: rest.user_id,
              title: 'Nouvelle commande (livreur OK) ✅',
              body: `Commande #${updatedOrder.id?.slice(0, 8)} - ${notificationTotal}€`,
              data: { type: 'new_order', orderId: updatedOrder.id, url: '/partner/orders' },
            }),
          }).catch(() => {});
        }
      }
    } catch (e) {
      console.warn('⚠️ accept-order: erreur notif restaurant (non bloquant):', e?.message || e);
    }

    return NextResponse.json({
      success: true,
      message: 'Commande acceptée avec succès',
      order: formattedOrder
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('❌ Erreur API accept-order:', error);
    console.error('❌ Stack trace:', error.stack);
    return NextResponse.json({ 
      error: 'Erreur serveur',
      details: error.message || 'Erreur inconnue',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500, headers: corsHeaders });
  }
}