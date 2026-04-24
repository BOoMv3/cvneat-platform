import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { isOrdersClosed } from '@/lib/ordersClosed';

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
    if (isOrdersClosed()) {
      return NextResponse.json(
        { error: 'Maintenance en cours. Les commandes sont temporairement indisponibles.' },
        { status: 503 }
      );
    }

    const { amount, currency = 'eur', metadata = {} } = await request.json();

    // Validation du montant
    let amountNumber = parseFloat(amount);
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
            .select('id, discount_amount, promo_code_id, frais_livraison, total, platform_discount_amount')
            .eq('id', orderId)
            .single();

          if (!orderErr && order) {
            const PLATFORM_FEE = 0.49;
            const AMOUNT_TOLERANCE = 0.50; // Tolérance arrondi (50 centimes) pour éviter refus sur petits écarts

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

            // Utiliser les valeurs STOCKÉES dans la commande (source de vérité) - pas de recalcul depuis details_commande
            // qui peut diverger (formules, combos, arrondis)
            const subtotal = parseFloat(order.total || 0) || 0;
            const discount = Math.min(Math.max(0, parseFloat(order.discount_amount || 0) || 0), subtotal);
            const subtotalAfterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
            const storedDeliveryFee = parseFloat(order.frais_livraison || 0) || 0;

            // Réduction fidélité déjà incluse dans discount_amount / frais_livraison (paliers, pas 1 pt = 1 €)
            let expectedAmount = Math.round((subtotalAfterDiscount + (isFreeDelivery ? 0 : storedDeliveryFee) + PLATFORM_FEE) * 100) / 100;
            const platformDiscountAmount = Math.min(
              subtotalAfterDiscount,
              Math.max(0, parseFloat(order.platform_discount_amount ?? 0) || 0)
            );
            if (platformDiscountAmount > 0) {
              expectedAmount = Math.max(0.5, Math.round((expectedAmount - platformDiscountAmount) * 100) / 100);
            }
            const amountDiff = Math.abs(amountNumber - expectedAmount);

            // 1. Frais de livraison invalides (0 < x < 2.50€) : corriger en BDD au lieu de bloquer le client
            if (!isFreeDelivery && storedDeliveryFee > 0 && storedDeliveryFee < 2.50) {
              console.warn('⚠️ Frais de livraison corrigés (0 < x < 2.50€) → 2.50€ pour commande:', orderId);
              await sb.from('commandes').update({ frais_livraison: 2.50 }).eq('id', orderId);
              // Recalculer expectedAmount avec 2.50€ de frais
              expectedAmount = Math.round((subtotalAfterDiscount + 2.50 + PLATFORM_FEE) * 100) / 100;
              if (platformDiscountAmount > 0) {
                expectedAmount = Math.max(0.5, Math.round((expectedAmount - platformDiscountAmount) * 100) / 100);
              }
              amountNumber = expectedAmount;
            } else if (amountDiff > AMOUNT_TOLERANCE) {
              // 2. Toujours facturer le montant de la commande (source de vérité) — ne jamais bloquer pour écart de montant
              console.warn('⚠️ Montant frontend diffère de la commande, utilisation du montant commande:', {
                orderId,
                amountNumber,
                expectedAmount,
                amountDiff,
              });
              amountNumber = expectedAmount;
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