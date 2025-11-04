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
      paymentIntentId,
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

    // Vérifier le paiement Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return NextResponse.json(
        { error: 'Paiement non réussi' },
        { status: 400 }
      );
    }

    // Insérer la publicité dans la base de données
    const insertData = {
      title,
      description: description || null,
      image_url,
      link_url: link_url || null,
      position,
      is_active: false, // En attente de validation admin
      start_date: start_date || null,
      end_date: end_date || null,
      price: parseFloat(price),
      advertiser_name,
      advertiser_email,
      advertiser_phone: advertiser_phone || null,
      stripe_payment_intent_id: paymentIntentId,
      payment_status: 'paid',
      status: 'pending_approval' // En attente d'approbation
    };

    const { data, error } = await supabaseAdmin
      .from('advertisements')
      .insert([insertData])
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la création de la publicité:', error);
      console.error('Données insérées:', insertData);
      return NextResponse.json(
        { 
          error: 'Erreur lors de la sauvegarde',
          details: error.message,
          hint: error.hint
        },
        { status: 500 }
      );
    }

    // Envoyer un email de confirmation (simulation)
    console.log(`Email envoyé à ${advertiser_email} pour la publicité: ${title}`);

    return NextResponse.json({
      success: true,
      payment_id: paymentIntentId,
      advertisement_id: data.id,
      message: 'Publicité créée avec succès. En attente de validation.'
    });

  } catch (error) {
    console.error('Erreur lors du traitement du paiement:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur', details: error.message },
      { status: 500 }
    );
  }
}

