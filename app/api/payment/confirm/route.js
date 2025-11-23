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
          .select('id, restaurant_id, total, frais_livraison')
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
              const notificationSent = sseBroadcaster.broadcast(orderData.restaurant_id, {
                type: 'new_order',
                message: `Nouvelle commande #${orderData.id?.slice(0, 8) || 'N/A'} - ${notificationTotal}€`,
                order: orderData,
                timestamp: new Date().toISOString()
              });
              console.log('🔔 Notification SSE envoyée après paiement:', notificationSent ? 'Oui' : 'Non (aucun client connecté)');
              console.log('💰 Montant notification (avec frais):', notificationTotal, '€');
            } catch (broadcastError) {
              console.warn('⚠️ Erreur broadcasting SSE:', broadcastError);
              // Ne pas faire échouer la confirmation de paiement si le broadcast échoue
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