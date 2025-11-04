import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Utiliser le client admin pour contourner RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      image_url,
      link_url,
      position,
      start_date,
      end_date,
      advertiser_name,
      advertiser_email,
      advertiser_phone,
      price
    } = body;

    // Validation des données
    if (!title || !image_url || !advertiser_name || !advertiser_email || !price) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // Créer le PaymentIntent Stripe
    const amount = Math.round(parseFloat(price) * 100); // Stripe utilise les centimes
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'eur',
        metadata: {
          type: 'advertisement',
          advertiser_name,
          advertiser_email,
          position,
          title
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Retourner le clientSecret pour le frontend
      return NextResponse.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: price
      });
    } catch (stripeError) {
      console.error('Erreur Stripe:', stripeError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du paiement Stripe' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}
