import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request) {
  try {
    const { amount, currency = 'eur', metadata = {} } = await request.json();

    // Validation du montant
    const amountNumber = parseFloat(amount);
    if (!amount || isNaN(amountNumber) || amountNumber <= 0) {
      console.error('❌ Montant invalide:', amount);
      return NextResponse.json(
        { error: 'Montant invalide. Le montant doit être supérieur à 0.' },
        { status: 400 }
      );
    }

    // Stripe exige un minimum de 0.50€ (50 centimes)
    const amountInCents = Math.round(amountNumber * 100);
    if (amountInCents < 50) {
      console.error('❌ Montant trop faible:', amountNumber, '€');
      return NextResponse.json(
        { error: 'Le montant minimum est de 0.50€' },
        { status: 400 }
      );
    }

    console.log('💳 Création PaymentIntent:', {
      amount: amountNumber,
      amountInCents,
      currency,
      metadata
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency,
      metadata,
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('❌ Erreur lors de la création du paiement:', error);
    console.error('❌ Détails erreur Stripe:', {
      message: error.message,
      type: error.type,
      code: error.code,
      statusCode: error.statusCode
    });
    
    // Messages d'erreur plus spécifiques selon le type d'erreur Stripe
    let errorMessage = 'Erreur lors de la création du paiement';
    if (error.type === 'StripeInvalidRequestError') {
      errorMessage = 'Erreur de configuration du paiement. Veuillez contacter contact@cvneat.fr';
    } else if (error.type === 'StripeAPIError') {
      errorMessage = 'Erreur de communication avec le service de paiement. Veuillez réessayer.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
} 