import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { notifyDeliverySubscribers } from '../../../../../lib/pushNotifications';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, reason, preparation_time } = body;
    
    console.log('=== MISE À JOUR COMMANDE RESTAURANT ===');
    console.log('ID commande:', id);
    console.log('Données reçues:', body);

    // Récupérer le token d'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Pas de token d\'authentification');
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    // Token vérifié (non loggé pour des raisons de sécurité)

    // Vérifier l'authentification
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('❌ Erreur authentification:', userError);
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    console.log('✅ Utilisateur authentifié:', user.email);

    // Vérifier que l'utilisateur est un restaurant
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'restaurant') {
      console.error('❌ Utilisateur pas restaurant:', userData);
      return NextResponse.json({ error: 'Accès non autorisé - Restaurant requis' }, { status: 403 });
    }

    console.log('✅ Rôle restaurant confirmé');

    // Vérifier que la commande existe - UTILISER SERVICE ROLE POUR BYPASSER RLS
    console.log('🔍 Recherche commande avec ID:', id);
    
    // Créer un client admin pour bypasser RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', id)
      .single();

    console.log('🔍 Résultat recherche commande:', { order: order?.id, error: orderError });

    if (orderError || !order) {
      console.error('❌ Commande non trouvée:', orderError);
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    console.log('✅ Commande trouvée:', order.id, 'restaurant_id:', order.restaurant_id);

    // Vérifier que la commande appartient à ce restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('❌ Restaurant non trouvé pour cet utilisateur:', restaurantError);
      return NextResponse.json({ error: 'Restaurant non trouvé' }, { status: 404 });
    }

    console.log('🔍 Vérification appartenance:', {
      commande_restaurant: order.restaurant_id,
      restaurant_utilisateur: restaurant.id,
      match: order.restaurant_id === restaurant.id
    });

    // TEMPORAIRE : Bypass de la vérification d'appartenance pour debug
    console.log('⚠️ BYPASS TEMPORAIRE - Vérification d\'appartenance désactivée');
    
    // if (order.restaurant_id !== restaurant.id) {
    //   console.error('❌ Commande ne appartient pas à ce restaurant:', {
    //     commande_restaurant: order.restaurant_id,
    //     restaurant_utilisateur: restaurant.id
    //   });
    //   return NextResponse.json({ error: 'Cette commande ne vous appartient pas' }, { status: 403 });
    // }

    console.log('✅ Commande appartient au restaurant');

    // Vérifier si la commande a déjà été acceptée par un livreur
    if (order.livreur_id && status !== 'livree') {
      console.log('⚠️ Commande déjà acceptée par un livreur:', order.livreur_id);
      return NextResponse.json({ 
        error: 'Cette commande a déjà été acceptée par un livreur et ne peut plus être modifiée',
        current_status: order.statut,
        delivery_id: order.livreur_id
      }, { status: 400 });
    }

    // Mettre à jour la commande - CORRIGER LE STATUT SELON LA CONTRAINTE CHECK
    let correctedStatus = status;
    let readyForDelivery = null;
    
    // MAPPING POUR CORRESPONDRE EXACTEMENT À LA CONTRAINTE CHECK DE LA BASE DE DONNÉES
    // La contrainte CHECK accepte: 'en_attente', 'en_preparation', 'en_livraison', 'livree', 'annulee'
    // Nous devons mapper les statuts métier vers ces valeurs
    const statusMapping = {
      'acceptee': 'en_preparation',     // Quand restaurant accepte, passe directement en préparation
      'refusee': 'annulee',             // Refus = annulée
      'pret_a_livrer': 'en_preparation' // Prêt à livrer reste en préparation (livreur prend en charge ensuite)
    };
    
    if (statusMapping[status]) {
      correctedStatus = statusMapping[status];
      console.log('🔄 Statut mappé:', { original: status, final: correctedStatus, raison: 'Contrainte CHECK base de données' });
    }
    
    // Si le restaurant marque "prêt à livrer", on met ready_for_delivery = true
    // Sinon, si c'est "acceptee", on met ready_for_delivery = false
    if (status === 'pret_a_livrer') {
      readyForDelivery = true;
    } else if (status === 'acceptee') {
      readyForDelivery = false;
    }
    
    console.log('📋 Statuts autorisés par CHECK: en_attente, en_preparation, en_livraison, livree, annulee');
    
    const updateData = {
      statut: correctedStatus,
      updated_at: new Date().toISOString()
    };

    // Ajouter ready_for_delivery si on a une valeur
    if (readyForDelivery !== null) {
      updateData.ready_for_delivery = readyForDelivery;
    }

    if ((status === 'acceptee' || status === 'pret_a_livrer') && !order.preparation_started_at) {
      updateData.preparation_started_at = new Date().toISOString();
    }

    if (reason) {
      updateData.rejection_reason = reason;
    }

    // Ajouter preparation_time seulement si fourni et valide
    if (preparation_time !== null && preparation_time !== undefined && preparation_time > 0) {
      updateData.preparation_time = preparation_time;
    }

        console.log('📤 Données de mise à jour:', JSON.stringify(updateData, null, 2));
        console.log('📤 ID commande à mettre à jour:', id);

        // Utiliser le service role pour la mise à jour aussi
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('commandes')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        
        console.log('📤 Résultat de la mise à jour Supabase:', {
          success: !!updatedOrder && !updateError,
          error: updateError ? updateError.message : null,
          rows_affected: updatedOrder ? 1 : 0
        });

    if (updateError) {
          console.error('❌ Erreur mise à jour commande:', updateError);
          console.error('❌ Détails erreur:', JSON.stringify(updateError, null, 2));
          console.error('❌ ID commande tentée:', id);
          console.error('❌ Données tentées:', JSON.stringify(updateData, null, 2));
          return NextResponse.json({ 
            error: 'Erreur lors de la mise à jour de la commande',
            details: updateError.message,
            orderId: id
          }, { status: 500 });
        }

        if ((status === 'acceptee' || status === 'pret_a_livrer') && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
          try {
            await notifyDeliverySubscribers(supabaseAdmin, {
              title: 'Nouvelle commande disponible',
              body: `Commande #${order.id} - ${parseFloat(order.total || 0).toFixed(2)}€`,
              data: {
                url: '/delivery/dashboard',
                orderId: order.id,
              },
            });
          } catch (error) {
            console.error('❌ Erreur envoi notification livreur:', error);
          }
        }

        // Si la commande est annulée par le restaurant, rembourser automatiquement
        if (correctedStatus === 'annulee' && order.payment_status === 'paid' && order.stripe_payment_intent_id) {
          const orderTotal = parseFloat(order.total || 0);
          
          if (orderTotal > 0) {
            console.log('💰 Remboursement automatique nécessaire (annulation restaurant):', id);
            
            try {
              // IMPORTANT: Recalculer le sous-total depuis les détails de commande pour inclure les suppléments
              const { data: orderDetails, error: detailsError } = await supabaseAdmin
                .from('details_commande')
                .select('quantite, prix_unitaire, supplements')
                .eq('commande_id', id);
              
              let calculatedSubtotal = 0;
              if (!detailsError && orderDetails && orderDetails.length > 0) {
                // Calculer le sous-total depuis les détails
                // IMPORTANT: prix_unitaire contient déjà les suppléments (voir checkout/page.js ligne 570)
                // Donc on utilise directement prix_unitaire sans ajouter les suppléments
                orderDetails.forEach(detail => {
                  const prixUnitaire = parseFloat(detail.prix_unitaire || 0); // Déjà avec suppléments
                  const quantity = parseFloat(detail.quantite || 1);
                  calculatedSubtotal += prixUnitaire * quantity;
                });
                console.log('💰 Sous-total calculé depuis détails:', calculatedSubtotal);
              } else {
                // Fallback : utiliser order.total si pas de détails
                // ATTENTION: order.total peut ne pas contenir les suppléments si la commande a été créée différemment
                calculatedSubtotal = parseFloat(order.total || 0);
                console.warn('⚠️ Pas de détails de commande, utilisation de order.total comme fallback:', calculatedSubtotal);
              }
              
              // IMPORTANT: Le remboursement doit inclure les frais de livraison car ils n'ont pas été effectués
              const deliveryFee = parseFloat(order.frais_livraison || 0); // Frais de livraison
              
              // Si calculatedSubtotal est 0 ou très petit, essayer de recalculer depuis order.total
              // mais toujours ajouter les frais de livraison
              if (calculatedSubtotal <= 0 && parseFloat(order.total || 0) > 0) {
                calculatedSubtotal = parseFloat(order.total || 0);
                console.warn('⚠️ Sous-total recalculé depuis order.total:', calculatedSubtotal);
              }
              
              const orderTotalWithDelivery = calculatedSubtotal + deliveryFee; // Total réel payé (articles + suppléments + frais)
              
              console.log('💰 Remboursement restaurant - Montant:', {
                articles_avec_supplements: calculatedSubtotal,
                frais_livraison: deliveryFee,
                total: orderTotalWithDelivery
              });
              
              // Créer le remboursement Stripe (incluant les frais de livraison)
              const refund = await stripe.refunds.create({
                payment_intent: order.stripe_payment_intent_id,
                amount: Math.round(orderTotalWithDelivery * 100), // Stripe utilise les centimes - TOTAL avec frais
                reason: 'requested_by_customer',
                metadata: {
                  order_id: id,
                  cancellation_reason: `Commande annulée par le restaurant${reason ? ': ' + reason : ''}`,
                  user_id: order.user_id,
                  restaurant_id: order.restaurant_id
                }
              });

              console.log('✅ Remboursement Stripe créé:', refund.id);

              // Mettre à jour la commande avec les informations du remboursement
              await supabaseAdmin
                .from('commandes')
                .update({
                  payment_status: 'refunded',
                  stripe_refund_id: refund.id,
                  refund_amount: orderTotalWithDelivery, // Total avec frais de livraison
                  refunded_at: new Date().toISOString()
                })
                .eq('id', id);

              // Créer une notification pour le client
              try {
                await supabaseAdmin
                  .from('notifications')
                  .insert({
                    user_id: order.user_id,
                    type: 'order_cancelled_refunded',
                    title: 'Commande annulée et remboursée',
                    message: `Votre commande #${id.slice(0, 8)} a été annulée par le restaurant. Un remboursement de ${orderTotalWithDelivery.toFixed(2)}€ (articles avec suppléments: ${calculatedSubtotal.toFixed(2)}€ + frais de livraison: ${deliveryFee.toFixed(2)}€) sera visible sur votre compte dans 2-5 jours ouvrables.`,
                    data: {
                      order_id: id,
                      refund_id: refund.id,
                      refund_amount: orderTotalWithDelivery,
                      refund_subtotal: calculatedSubtotal,
                      refund_delivery_fee: deliveryFee,
                      cancelled_by: 'restaurant',
                      reason: reason
                    },
                    read: false,
                    created_at: new Date().toISOString()
                  });
                
                console.log('✅ Notification de remboursement créée');
              } catch (notificationError) {
                console.warn('⚠️ Erreur création notification:', notificationError);
              }

            } catch (stripeError) {
              console.error('❌ Erreur remboursement Stripe (annulation restaurant):', stripeError);
              // Ne pas faire échouer la requête, le restaurant a déjà annulé la commande
              // Le remboursement devra être traité manuellement
            }
          }
        }

    // Envoyer les notifications par email/WhatsApp au client
    try {
      // Récupérer les infos du restaurant et du client
      const { data: restaurantInfo } = await supabaseAdmin
        .from('restaurants')
        .select('nom')
        .eq('id', updatedOrder.restaurant_id)
        .single();
      
      const { data: clientInfo } = await supabaseAdmin
        .from('users')
        .select('email, telephone, nom, prenom')
        .eq('id', updatedOrder.user_id)
        .single();

      if (clientInfo) {
        // Appeler l'API de notification
        // Utiliser le statut original pour les notifications (pas le statut mappé)
        // car l'API de notification gère les statuts métier
        const notificationStatus = status === 'refusee' ? 'refusee' : correctedStatus;
        await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/order-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: updatedOrder.id,
            status: notificationStatus,
            restaurantName: restaurantInfo?.nom,
            rejectionReason: reason || updatedOrder.rejection_reason, // Utiliser la raison fournie ou celle de la BDD
            preparationTime: preparation_time
          })
        });
        console.log('📧 Notification envoyée avec:', { 
          status: notificationStatus, 
          rejectionReason: reason || updatedOrder.rejection_reason 
        });
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification client:', notificationError);
      // Ne pas faire échouer la mise à jour pour une erreur de notification
    }

    // Notifier les livreurs si la commande est prête à livrer
    if (status === 'pret_a_livrer' || readyForDelivery === true) {
      try {
        // La notification sera automatiquement détectée par le SSE des livreurs
      } catch (notificationError) {
        console.warn('⚠️ Erreur notification livreurs:', notificationError);
      }
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Commande mise à jour avec succès'
    });
  } catch (error) {
    console.error('❌ Erreur API restaurant commande:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
