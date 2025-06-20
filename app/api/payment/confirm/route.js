import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { paymentIntentId, orderId } = await request.json();

    if (!paymentIntentId || !orderId) {
      return NextResponse.json(
        { error: 'Paramètres manquants' },
        { status: 400 }
      );
    }

    // Récupérer l'intention de paiement
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === 'succeeded') {
      // Mettre à jour le statut de la commande
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'confirmed',
          payment_status: 'paid',
          payment_intent_id: paymentIntentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) {
        console.error('Erreur lors de la mise à jour de la commande:', error);
        return NextResponse.json(
          { error: 'Erreur lors de la mise à jour de la commande' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Paiement confirmé avec succès',
        orderId
      });
    } else {
      return NextResponse.json(
        { error: 'Paiement non réussi' },
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