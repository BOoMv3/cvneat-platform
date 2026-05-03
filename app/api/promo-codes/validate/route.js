import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-Id, X-User-Role, X-User-Email',
  'Access-Control-Max-Age': '86400',
  'X-Promo-Validate-Version': '2026-02-08.1',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * POST /api/promo-codes/validate
 * Valide un code promo et retourne la réduction applicable
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { code, userId, orderAmount, restaurantId, isFirstOrder = false, deliveryFeeEur } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code promo requis' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!orderAmount || orderAmount <= 0) {
      return NextResponse.json(
        { error: 'Montant de commande requis' },
        { status: 400, headers: corsHeaders }
      );
    }

    const codeToValidate = code.toUpperCase().trim();

    // Some environments can send a userId that exists in auth but not in our public `users` table.
    // The SQL RPC `validate_promo_code` can throw in that case.
    // To ensure promo validation never hard-fails, we fallback to anonymous validation (userId = null).
    let safeUserId = userId || null;
    if (safeUserId) {
      const looksLikeUuid = typeof safeUserId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(safeUserId);
      if (!looksLikeUuid) {
        console.warn('⚠️ userId invalide (pas un UUID), fallback null:', safeUserId);
        safeUserId = null;
      } else {
        const { data: userRow, error: userRowError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('id', safeUserId)
          .maybeSingle();
        if (userRowError) {
          console.warn('⚠️ Erreur lecture users, fallback null:', userRowError);
          safeUserId = null;
        } else if (!userRow?.id) {
          console.warn('⚠️ Profil users manquant, fallback null:', safeUserId);
          safeUserId = null;
        }
      }
    }

    console.log('🔍 Validation code promo:', {
      code: codeToValidate,
      userId: safeUserId || 'N/A',
      orderAmount,
      restaurantId: restaurantId || 'N/A',
      isFirstOrder
    });

    // Pour les codes ROULETTE, vérifier d'abord dans wheel_wins
    if (codeToValidate.startsWith('ROULETTE')) {
      const { data: wheelWin, error: wheelWinError } = await supabaseAdmin
        .from('wheel_wins')
        .select('id, user_id, promo_code, promo_code_id, valid_until, used_at, prize_type')
        .eq('promo_code', codeToValidate)
        .single();

      if (wheelWinError || !wheelWin) {
        console.log('⚠️ Code ROULETTE non trouvé dans wheel_wins:', codeToValidate);
        return NextResponse.json(
          { valid: false, message: 'Code promo invalide ou expiré' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Vérifier que le code appartient à l'utilisateur
      if (wheelWin.user_id && userId && wheelWin.user_id !== userId) {
        console.log('⚠️ Code ROULETTE appartient à un autre utilisateur:', {
          wheelWinUserId: wheelWin.user_id,
          currentUserId: userId
        });
        return NextResponse.json(
          { valid: false, message: 'Ce code promo est personnel et ne peut être utilisé que par son propriétaire' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Vérifier que le code n'est pas expiré
      if (wheelWin.valid_until && new Date(wheelWin.valid_until) < new Date()) {
        console.log('⚠️ Code ROULETTE expiré:', codeToValidate);
        return NextResponse.json(
          { valid: false, message: 'Ce code promo a expiré' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Vérifier que le code n'a pas déjà été utilisé
      if (wheelWin.used_at) {
        console.log('⚠️ Code ROULETTE déjà utilisé:', codeToValidate);
        return NextResponse.json(
          { valid: false, message: 'Ce code promo a déjà été utilisé' },
          { status: 200, headers: corsHeaders }
        );
      }

      // Si le code a un promo_code_id, récupérer les détails du code promo
      if (wheelWin.promo_code_id) {
        const { data: promoCode, error: promoError } = await supabaseAdmin
          .from('promo_codes')
          .select('*')
          .eq('id', wheelWin.promo_code_id)
          .single();

        if (!promoError && promoCode) {
          // Calculer la réduction
          let discountAmount = 0;
          if (promoCode.discount_type === 'percentage') {
            discountAmount = (orderAmount * promoCode.discount_value / 100);
            if (promoCode.max_discount_amount) {
              discountAmount = Math.min(discountAmount, parseFloat(promoCode.max_discount_amount));
            }
          } else if (promoCode.discount_type === 'fixed') {
            discountAmount = Math.min(parseFloat(promoCode.discount_value), orderAmount);
          } else if (promoCode.discount_type === 'free_delivery') {
            discountAmount = 0; // Sera géré séparément
          } else if (promoCode.discount_type === 'delivery_percent') {
            const pct = Math.min(100, Math.max(0, parseFloat(promoCode.discount_value) || 0));
            const dFee = Math.max(0, parseFloat(deliveryFeeEur));
            if (!Number.isFinite(dFee) || dFee <= 0) {
              return NextResponse.json(
                {
                  valid: false,
                  message:
                    'Calcule d’abord les frais de livraison (adresse), puis réapplique le code.',
                  discountAmount: 0,
                },
                { status: 200, headers: corsHeaders }
              );
            }
            const deliveryDiscountEur = Math.round(dFee * (pct / 100) * 100) / 100;
            return NextResponse.json(
              {
                valid: true,
                discountAmount: 0,
                discountType: 'delivery_percent',
                deliveryPercent: pct,
                deliveryDiscountEur,
                message: `−${pct}% sur la livraison (−${deliveryDiscountEur.toFixed(2)}€)`,
                description: promoCode.description || wheelWin.description || '',
                promoCodeId: promoCode.id,
              },
              { headers: corsHeaders }
            );
          }

          console.log('✅ Code ROULETTE valide:', {
            code: codeToValidate,
            discountAmount,
            discountType: promoCode.discount_type
          });

          return NextResponse.json({
            valid: true,
            discountAmount: discountAmount,
            discountType: promoCode.discount_type,
            message: 'Code promo valide',
            description: promoCode.description || wheelWin.description || '',
            promoCodeId: promoCode.id
          }, { headers: corsHeaders });
        }
      }

      // Si pas de promo_code_id mais que c'est une boisson offerte, retourner une validation spéciale
      if (wheelWin.prize_type === 'free_drink') {
        console.log('✅ Code ROULETTE - Boisson offerte (pas de code promo)');
        return NextResponse.json({
          valid: true,
          discountAmount: 0,
          discountType: 'free_drink',
          message: 'Boisson offerte - sera ajoutée automatiquement',
          description: wheelWin.description || 'Boisson offerte',
          promoCodeId: null,
          isFreeDrink: true
        }, { headers: corsHeaders });
      }
    }

    // Appeler la fonction SQL de validation pour les autres codes
    const callValidateRpc = async (rpcUserId) => {
      return await supabaseAdmin.rpc('validate_promo_code', {
        p_code: codeToValidate,
        p_user_id: rpcUserId || null,
        p_order_amount: parseFloat(orderAmount),
        p_restaurant_id: restaurantId || null,
        p_is_first_order: isFirstOrder,
      });
    };

    // Some DB setups can throw inside validate_promo_code when p_user_id is provided.
    // To keep the checkout reliable, we retry once with p_user_id = null.
    let { data, error } = await callValidateRpc(safeUserId || null);
    if (error && safeUserId) {
      console.warn('⚠️ validate_promo_code RPC error with userId, retrying anonymous:', error);
      ({ data, error } = await callValidateRpc(null));
    }

    if (error) {
      console.error('Erreur validation code promo:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la validation du code promo' },
        { status: 500, headers: corsHeaders }
      );
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Code promo non trouvé dans promo_codes:', codeToValidate);
      return NextResponse.json(
        { valid: false, message: 'Code promo invalide' },
        { status: 200, headers: corsHeaders }
      );
    }

    const result = data[0];

    if (!result.valid) {
      return NextResponse.json({
        valid: false,
        message: result.message,
        discountAmount: 0
      }, { headers: corsHeaders });
    }

    // Récupérer les détails du code promo pour le type de réduction
    const { data: promoCode, error: promoError } = await supabaseAdmin
      .from('promo_codes')
      .select('discount_type, discount_value, description')
      .eq('id', result.promo_code_id)
      .single();

    const discountType = promoCode?.discount_type || 'fixed';

    if (discountType === 'delivery_percent') {
      const pct = Math.min(100, Math.max(0, parseFloat(promoCode?.discount_value) || 0));
      const dFee = Math.max(0, parseFloat(deliveryFeeEur));
      if (!Number.isFinite(dFee) || dFee <= 0) {
        return NextResponse.json(
          {
            valid: false,
            message:
              'Calcule d’abord les frais de livraison (adresse), puis réapplique le code, ou ouvre le checkout depuis le panier.',
            discountAmount: 0,
          },
          { status: 200, headers: corsHeaders }
        );
      }
      const deliveryDiscountEur = Math.round(dFee * (pct / 100) * 100) / 100;
      return NextResponse.json(
        {
          valid: true,
          discountAmount: 0,
          discountType: 'delivery_percent',
          deliveryPercent: pct,
          deliveryDiscountEur,
          message: `−${pct}% sur la livraison (−${deliveryDiscountEur.toFixed(2)}€)`,
          description: promoCode?.description || '',
          promoCodeId: result.promo_code_id,
        },
        { headers: corsHeaders }
      );
    }

    return NextResponse.json({
      valid: true,
      discountAmount: parseFloat(result.discount_amount),
      discountType,
      message: result.message,
      description: promoCode?.description || '',
      promoCodeId: result.promo_code_id,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Erreur API validation code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}

