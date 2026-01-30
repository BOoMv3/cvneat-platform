import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

let cachedServiceClient = null;
function getServiceClient() {
  if (cachedServiceClient) return cachedServiceClient;

  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://jxbgrvlmvnofaxbtcmsw.supabase.co';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return null;

  cachedServiceClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedServiceClient;
}

export async function POST(request) {
  try {
    const { amount, currency = 'eur', metadata = {} } = await request.json();

    // Validation du montant
    const amountNumber = parseFloat(amount);
    if (!amount || isNaN(amountNumber) || amountNumber <= 0) {
      console.error('❌ Montant invalide:', amount);
      return NextResponse.json(
        { error: 'Montant invalide. Le montant doit être supérieur à 0.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Sécurité/fiabilité: empêcher de facturer une livraison < 2.50€ (sauf promo "free_delivery")
    // On ne fait PAS confiance au montant client; on vérifie la cohérence à partir de la commande.
    // Si incohérence, on bloque plutôt que de facturer un mauvais montant.
    const orderId = metadata?.order_id;
    if (orderId) {
      const sb = getServiceClient();
      if (!sb) {
        console.warn('⚠️ Service role Supabase manquant: impossible de valider le montant côté serveur');
      } else {
        try {
          const { data: order, error: orderErr } = await sb
            .from('commandes')
            .select('id, discount_amount, promo_code_id')
            .eq('id', orderId)
            .single();

          if (!orderErr && order) {
            const { data: details, error: detErr } = await sb
              .from('details_commande')
              .select('quantite, prix_unitaire')
              .eq('commande_id', orderId);

            if (!detErr && Array.isArray(details)) {
              const subtotal = details.reduce((sum, d) => {
                const q = parseFloat(d.quantite || 0) || 0;
                const pu = parseFloat(d.prix_unitaire || 0) || 0;
                return sum + q * pu;
              }, 0);

              const discount = Math.min(
                Math.max(0, parseFloat(order.discount_amount || 0) || 0),
                subtotal
              );
              const subtotalAfterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

              // Déterminer si la livraison est offerte via le code promo (si présent)
              let isFreeDelivery = false;
              if (order.promo_code_id) {
                const { data: promo } = await sb
                  .from('promo_codes')
                  .select('discount_type')
                  .eq('id', order.promo_code_id)
                  .maybeSingle();
                isFreeDelivery = promo?.discount_type === 'free_delivery';
              }

              const PLATFORM_FEE = 0.49;
              const derivedDeliveryFee = Math.round((amountNumber - subtotalAfterDiscount - PLATFORM_FEE) * 100) / 100;

              if (!isFreeDelivery && derivedDeliveryFee < 2.5 - 0.01) {
                console.error('❌ Montant incohérent: frais de livraison < 2.50€ détectés', {
                  orderId,
                  amountNumber,
                  subtotal,
                  subtotalAfterDiscount,
                  discount,
                  platformFee: PLATFORM_FEE,
                  derivedDeliveryFee,
                  promo_code_id: order.promo_code_id,
                });
                return NextResponse.json(
                  {
                    error:
                      'Erreur de calcul des frais de livraison. Veuillez rafraîchir et réessayer (si le problème persiste, contactez le support).',
                    code: 'DELIVERY_FEE_TOO_LOW',
                  },
                  { status: 400, headers: corsHeaders }
                );
              }
            }
          }
        } catch (e) {
          // Ne pas bloquer si la vérification échoue, mais logguer: Stripe reste possible.
          console.warn('⚠️ Vérification montant (commande) échouée:', e?.message || e);
        }
      }
    }

    // Stripe exige un minimum de 0.50€ (50 centimes)
    const amountInCents = Math.round(amountNumber * 100);
    if (amountInCents < 50) {
      console.error('❌ Montant trop faible:', amountNumber, '€');
      return NextResponse.json(
        { error: 'Le montant minimum est de 0.50€' },
        { status: 400, headers: corsHeaders }
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
    }, { headers: corsHeaders });
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
      { status: 500, headers: corsHeaders }
    );
  }
} 