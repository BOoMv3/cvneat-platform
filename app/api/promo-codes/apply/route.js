import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/promo-codes/apply
 * Enregistre l'utilisation d'un code promo après une commande
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { promoCodeId, userId, orderId, discountAmount, orderAmount } = body;

    if (!promoCodeId || !orderId || discountAmount === undefined) {
      return NextResponse.json(
        { error: 'Paramètres requis: promoCodeId, orderId, discountAmount' },
        { status: 400 }
      );
    }

    // Enregistrer l'utilisation
    const { data: usage, error: usageError } = await supabaseAdmin
      .from('promo_code_usage')
      .insert([{
        promo_code_id: promoCodeId,
        user_id: userId || null,
        order_id: orderId,
        discount_amount: parseFloat(discountAmount),
        order_amount: parseFloat(orderAmount || 0)
      }])
      .select()
      .single();

    if (usageError) {
      console.error('Erreur enregistrement utilisation code promo:', usageError);
      return NextResponse.json(
        { error: 'Erreur lors de l\'enregistrement de l\'utilisation' },
        { status: 500 }
      );
    }

    // Incrémenter le compteur d'utilisations du code promo
    const { error: updateError } = await supabaseAdmin.rpc('increment_promo_code_uses', {
      p_promo_code_id: promoCodeId
    });

    if (updateError) {
      console.warn('Erreur incrémentation compteur (non bloquant):', updateError);
      // Ne pas bloquer si l'incrémentation échoue
    }

    return NextResponse.json({
      success: true,
      usageId: usage.id
    });

  } catch (error) {
    console.error('Erreur API application code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

