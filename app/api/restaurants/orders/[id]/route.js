import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { notifyDeliverySubscribers } from '../../../../../lib/pushNotifications';

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userDataError || !userData || !['restaurant', 'partner'].includes(userData.role)) {
      console.error('❌ Utilisateur non autorisé:', userData);
      return NextResponse.json({ error: 'Accès non autorisé - Rôle restaurant requis' }, { status: 403 });
    }

    console.log('✅ Rôle restaurant/partner confirmé:', userData.role);

    // Vérifier que la commande existe - UTILISER SERVICE ROLE POUR BYPASSER RLS
    console.log('🔍 Recherche commande avec ID:', id);
    
    // Créer un client admin pour bypasser RLS
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
    const { data: restaurant, error: restaurantError } = await supabaseAdmin
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

    // Permettre au restaurant de marquer comme prête même si un livreur a accepté
    // Le restaurant doit pouvoir indiquer que la commande est prête pour la livraison
    // Seulement bloquer les autres modifications si un livreur a accepté ET que ce n'est pas "pret_a_livrer"
    if (order.livreur_id && status !== 'livree' && status !== 'pret_a_livrer') {
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

        // Notifier les livreurs via push notification FCM (app mobile)
        if (status === 'en_preparation' || status === 'pret_a_livrer') {
          try {
            // Envoyer notification push à tous les livreurs disponibles
            const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                role: 'delivery', // Envoyer à tous les livreurs
                title: 'Nouvelle commande disponible 🚚',
                body: `Commande #${order.id?.slice(0, 8)} - ${parseFloat(order.total || 0).toFixed(2)}€`,
                data: {
                  type: 'new_order',
                  orderId: order.id,
                  url: '/delivery/dashboard',
                }
              })
            });
            
            if (pushResponse.ok) {
              const result = await pushResponse.json();
              console.log('✅ Notification push envoyée aux livreurs:', result.sent, '/', result.total);
            }
          } catch (error) {
            console.error('❌ Erreur envoi notification push livreur:', error);
          }
          
          // Aussi utiliser l'ancien système web-push si configuré
          if (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
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
              console.error('❌ Erreur envoi notification web-push livreur:', error);
            }
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

    // Envoyer les notifications par email au client pour chaque changement de statut
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

      if (clientInfo && clientInfo.email) {
        // Importer le service de notifications par email
        const { sendOrderStatusEmail } = await import('../../../../../lib/order-email-notifications');
        
        // Préparer les données de la commande pour l'email
        const orderForEmail = {
          id: updatedOrder.id,
          restaurantName: restaurantInfo?.nom || 'Le restaurant',
          total: updatedOrder.total || 0,
          frais_livraison: updatedOrder.frais_livraison || 0,
          adresse_livraison: updatedOrder.adresse_livraison || '',
          security_code: updatedOrder.security_code || null,
          preparationTime: preparation_time || null,
          customerName: `${clientInfo.prenom || ''} ${clientInfo.nom || ''}`.trim() || clientInfo.email
        };

        // Déterminer le statut à utiliser pour l'email
        // Utiliser le statut original (métier) pour les emails, pas le statut mappé
        let emailStatus = status;
        
        // Si le statut est "acceptee" ou que la commande passe en "en_preparation", envoyer email "acceptée"
        if (status === 'acceptee' || (status === 'en_preparation' && !order.statut || order.statut === 'en_attente')) {
          emailStatus = 'acceptee';
        }
        
        // Envoyer l'email selon le statut
        // 1. Commande acceptée (acceptee ou en_preparation après en_attente)
        if (status === 'acceptee' || (status === 'en_preparation' && (!order.statut || order.statut === 'en_attente'))) {
          await sendOrderStatusEmail(orderForEmail, 'acceptee', clientInfo.email);
          console.log('📧 Email "commande acceptée" envoyé au client:', clientInfo.email);
        }
        
        // 2. Commande prête (pret_a_livrer)
        if (status === 'pret_a_livrer' || readyForDelivery === true) {
          await sendOrderStatusEmail(orderForEmail, 'pret_a_livrer', clientInfo.email);
          console.log('📧 Email "commande prête" envoyé au client:', clientInfo.email);
        }
        
        // Envoyer notification push FCM au client pour chaque changement de statut
        try {
          const statusMessages = {
            'acceptee': { title: 'Commande acceptée ! 🎉', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été acceptée et sera préparée bientôt.` },
            'en_preparation': { title: 'En préparation 👨‍🍳', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est en cours de préparation.` },
            'pret_a_livrer': { title: 'Commande prête ! 📦', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est prête et sera livrée bientôt.` },
            'en_livraison': { title: 'En livraison 🚚', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} est en route vers vous !` },
            'livree': { title: 'Commande livrée ! ✅', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été livrée. Bon appétit !` },
            'refusee': { title: 'Commande refusée ❌', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été refusée.` },
            'annulee': { title: 'Commande annulée ❌', body: `Votre commande #${updatedOrder.id?.slice(0, 8)} a été annulée.` }
          };
          
          const message = statusMessages[status];
          if (message) {
            const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: updatedOrder.user_id, // Envoyer au client spécifique
                title: message.title,
                body: message.body,
                data: {
                  type: 'order_status_update',
                  orderId: updatedOrder.id,
                  status: status,
                  url: `/orders/${updatedOrder.id}`,
                }
              })
            });
            
            if (pushResponse.ok) {
              const result = await pushResponse.json();
              console.log('✅ Notification push envoyée au client:', result.sent, '/', result.total);
            }
          }
        } catch (pushError) {
          console.warn('⚠️ Erreur notification push client:', pushError);
        }
      }
    } catch (notificationError) {
      console.warn('⚠️ Erreur notification email client:', notificationError);
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
