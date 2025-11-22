import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/promo-codes/validate
 * Valide un code promo et retourne la réduction applicable
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, userId, orderAmount, restaurantId, isFirstOrder = false } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code promo requis' },
        { status: 400 }
      );
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json(
        { error: 'Montant de commande requis' },
        { status: 400 }
      );
    }

    // Appeler la fonction SQL de validation
    const { data, error } = await supabaseAdmin.rpc('validate_promo_code', {
      p_code: code.toUpperCase().trim(),
      p_user_id: userId || null,
      p_order_amount: parseFloat(orderAmount),
      p_restaurant_id: restaurantId || null,
      p_is_first_order: isFirstOrder
    });

    if (error) {
      console.error('Erreur validation code promo:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la validation du code promo' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { valid: false, message: 'Code promo invalide' },
        { status: 200 }
      );
    }

    const result = data[0];

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        message: result.message,
        discountAmount: 0
      });
    }

    // Récupérer les détails du code promo pour le type de réduction
    const { data: promoCode, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('discount_type, description')
      .eq('id', result.promo_code_id)
      .single();

    return NextResponse.json({
      valid: true,
      discountAmount: parseFloat(result.discount_amount),
      discountType: promoCode?.discount_type || 'fixed',
      message: result.message,
      description: promoCode?.description || '',
      promoCodeId: result.promo_code_id
    });

  } catch (error) {
    console.error('Erreur API validation code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

