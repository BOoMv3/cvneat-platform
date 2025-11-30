import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function POST(request, { params }) {
  try {
    const { orderId } = params;
    console.log('🔍 API accept-order appelée pour commande:', orderId);
    
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

    // Vérifier que la commande n'est pas déjà acceptée par un autre livreur
    if (order.livreur_id && order.livreur_id !== user.id) {
      return NextResponse.json({ error: 'Commande déjà acceptée par un autre livreur' }, { status: 409 });
    }

    // Vérifier que la commande est dans un statut acceptable
    // Les statuts autorisés par la contrainte CHECK sont: 'en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'
    // Les livreurs peuvent accepter les commandes 'en_preparation' ou 'pret_a_livrer'
    if (!['en_preparation', 'pret_a_livrer'].includes(order.statut)) {
      console.log('❌ Statut commande non acceptable pour livreur:', order.statut);
      return NextResponse.json({ 
        error: 'Commande non disponible pour livraison', 
        details: `Statut actuel: ${order.statut}. Seules les commandes en préparation peuvent être acceptées.` 
      }, { status: 400 });
    }

    // Accepter la commande
    console.log('📤 Mise à jour commande:', {
      orderId,
      livreur_id: user.id,
      statut: ['pret_a_livrer', 'en_livraison'].includes(order.statut) || order.ready_for_delivery ? 'en_livraison' : order.statut
    });
    
    const shouldMoveToDelivery = order.statut === 'pret_a_livrer' || order.ready_for_delivery === true || order.statut === 'en_livraison';
    const updatePayload = {
      livreur_id: user.id,
      updated_at: new Date().toISOString()
    };

    if (shouldMoveToDelivery) {
      updatePayload.statut = 'en_livraison';
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
          postal_code: enrichedOrder.code_postal_livraison || null,
          delivery_instructions: enrichedOrder.instructions_livraison || null
        };
      } else if (enrichedOrder.user_id) {
        const { data: address } = await supabaseAdmin
          .from('user_addresses')
          .select('id, address, city, postal_code, delivery_instructions')
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
          code_postal_livraison: enrichedOrder.code_postal_livraison || deliveryAddress?.postal_code || null,
          instructions_livraison: enrichedOrder.instructions_livraison || deliveryAddress?.delivery_instructions || null,
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
          delivery_postal_code: enrichedOrder.code_postal_livraison || deliveryAddress?.postal_code || null,
          delivery_instructions: enrichedOrder.instructions_livraison || deliveryAddress?.delivery_instructions || null
        }
      : updatedOrder;

    // Envoyer email au client quand un livreur accepte la commande (livreur en route)
    if (shouldMoveToDelivery && formattedOrder && formattedOrder.customer_email) {
      try {
        const { sendOrderStatusEmail } = await import('../../../../../lib/order-email-notifications');
        
        const orderForEmail = {
          id: formattedOrder.id,
          restaurantName: formattedOrder.restaurant?.nom || 'Le restaurant',
          total: formattedOrder.total || 0,
          frais_livraison: formattedOrder.frais_livraison || 0,
          adresse_livraison: formattedOrder.adresse_livraison || formattedOrder.delivery_address || '',
          security_code: formattedOrder.security_code || null,
          customerName: formattedOrder.customer_name || 'Cher client',
          estimatedDeliveryTime: '10-15' // Temps estimé par défaut
        };
        
        await sendOrderStatusEmail(orderForEmail, 'en_livraison', formattedOrder.customer_email);
        console.log('📧 Email "livreur en route" envoyé au client:', formattedOrder.customer_email);
      } catch (emailError) {
        console.warn('⚠️ Erreur envoi email "livreur en route":', emailError);
        // Ne pas faire échouer la requête si l'email échoue
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Commande acceptée avec succès',
      order: formattedOrder
    });
  } catch (error) {
    console.error('❌ Erreur API accept-order:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}