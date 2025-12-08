import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';
import sseBroadcaster from '../../../../lib/sse-broadcast';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { paymentIntentId, orderId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json(
        { error: 'PaymentIntentId manquant' },
        { status: 400 }
      );
    }

    // Récupérer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // SIMPLIFICATION: Récupérer l'orderId depuis les metadata si non fourni
      const orderIdToUpdate = orderId || paymentIntent.metadata?.order_id;
      
      if (orderIdToUpdate) {
        // Récupérer les informations complètes de la commande avant la mise à jour
        const { data: orderData, error: fetchError } = await supabase
          .from('commandes')
          .select(`
            id, restaurant_id, total, frais_livraison, security_code,
            customer_email, customer_first_name, customer_last_name,
            adresse_livraison,
            restaurants (nom),
            details_commande (id, quantite, prix_unitaire, customizations, menus (nom))
          `)
          .eq('id', orderIdToUpdate)
          .single();

        const { error } = await supabase
          .from('commandes')
          .update({ 
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntentId,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderIdToUpdate);

        if (error) {
          console.error('⚠️ Erreur mise à jour commande (non bloquant):', error);
          // Ne pas bloquer - le webhook Stripe gérera la mise à jour
        } else {
          console.log('✅ Commande mise à jour:', orderIdToUpdate);
          
          // IMPORTANT: Envoyer la notification SSE uniquement après confirmation du paiement
          if (orderData && orderData.restaurant_id) {
            try {
              const notificationTotal = (parseFloat(orderData.total || 0) + parseFloat(orderData.frais_livraison || 0)).toFixed(2);
              
              // 1. Notification SSE (pour les clients connectés)
              const notificationSent = sseBroadcaster.broadcast(orderData.restaurant_id, {
                type: 'new_order',
                message: `Nouvelle commande #${orderData.id?.slice(0, 8) || 'N/A'} - ${notificationTotal}€`,
                order: orderData,
                timestamp: new Date().toISOString()
              });
              console.log('🔔 Notification SSE envoyée après paiement:', notificationSent ? 'Oui' : 'Non (aucun client connecté)');
              
              // 2. Notification push FCM pour le restaurant
              try {
                // Récupérer le user_id du restaurant depuis la table restaurants
                const { data: restaurantData, error: restaurantError } = await supabase
                  .from('restaurants')
                  .select('user_id')
                  .eq('id', orderData.restaurant_id)
                  .single();
                
                if (!restaurantError && restaurantData && restaurantData.user_id) {
                  const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: restaurantData.user_id,
                      title: 'Nouvelle commande ! 🎉',
                      body: `Commande #${orderData.id?.slice(0, 8)} - ${notificationTotal}€`,
                      data: {
                        type: 'new_order',
                        orderId: orderData.id,
                        url: '/partner/orders'
                      }
                    })
                  });
                  
                  if (pushResponse.ok) {
                    const result = await pushResponse.json();
                    console.log('✅ Notification push envoyée au restaurant:', result.sent, '/', result.total);
                  } else {
                    console.warn('⚠️ Erreur réponse push notification restaurant:', pushResponse.status);
                  }
                } else {
                  console.warn('⚠️ Restaurant ou user_id non trouvé:', restaurantError?.message || 'Aucun user_id');
                }
              } catch (pushError) {
                console.warn('⚠️ Erreur envoi notification push restaurant:', pushError);
              }
              
              // 3. Notification push FCM pour les livreurs (commande disponible)
              try {
                const pushResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'https://cvneat.fr'}/api/notifications/send-push`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    role: 'delivery',
                    title: 'Nouvelle commande disponible 🚚',
                    body: `Commande #${orderData.id?.slice(0, 8)} - ${notificationTotal}€`,
                    data: {
                      type: 'new_order_available',
                      orderId: orderData.id,
                      url: '/delivery/dashboard'
                    }
                  })
                });
                
                if (pushResponse.ok) {
                  const result = await pushResponse.json();
                  console.log('✅ Notification push envoyée aux livreurs:', result.sent, '/', result.total);
                } else {
                  console.warn('⚠️ Erreur réponse push notification livreurs:', pushResponse.status);
                }
              } catch (pushError) {
                console.warn('⚠️ Erreur envoi notification push livreurs:', pushError);
              }
              
              console.log('💰 Montant notification (avec frais):', notificationTotal, '€');
            } catch (broadcastError) {
              console.warn('⚠️ Erreur broadcasting SSE:', broadcastError);
            }
          }
          
          // Envoyer l'email de confirmation au client
          if (orderData && orderData.customer_email) {
            try {
              // Formater les items pour l'email
              const items = (orderData.details_commande || []).map(detail => {
                let customizations = {};
                if (detail.customizations) {
                  customizations = typeof detail.customizations === 'string' 
                    ? JSON.parse(detail.customizations) 
                    : detail.customizations;
                }
                const isCombo = customizations.combo && customizations.combo.comboName;
                return {
                  name: isCombo ? customizations.combo.comboName : (detail.menus?.nom || 'Article'),
                  quantity: detail.quantite || 1,
                  price: detail.prix_unitaire || 0,
                  isCombo,
                  comboDetails: isCombo ? customizations.combo.details : null
                };
              });

              await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr'}/api/email/order-confirmation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  order: {
                    id: orderData.id,
                    securityCode: orderData.security_code,
                    customerName: `${orderData.customer_first_name || ''} ${orderData.customer_last_name || ''}`.trim(),
                    restaurantName: orderData.restaurants?.nom || 'Restaurant',
                    deliveryAddress: orderData.adresse_livraison,
                    items,
                    deliveryFee: parseFloat(orderData.frais_livraison || 0),
                    platformFee: 0.49
                  },
                  customerEmail: orderData.customer_email
                })
              });
              console.log('📧 Email de confirmation envoyé à:', orderData.customer_email);
            } catch (emailError) {
              console.warn('⚠️ Erreur envoi email confirmation:', emailError);
              // Ne pas bloquer si l'email échoue
            }
          }
        }
      } else {
        console.warn('⚠️ Aucun orderId trouvé dans paymentIntent metadata');
      }

      return NextResponse.json({
        success: true,
        message: 'Paiement confirmé avec succès',
        paymentIntentId,
        orderId: orderIdToUpdate || null
      });
    } else {
      return NextResponse.json(
        { error: `Paiement non réussi. Statut: ${paymentIntent.status}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Erreur lors de la confirmation du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la confirmation du paiement' },
      { status: 500 }
    );
  }
} 