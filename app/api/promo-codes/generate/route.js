import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * POST /api/promo-codes/generate
 * Génère un code promo unique pour un gain de la roue
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { userId, prizeType, prizeValue, orderId } = body;

    if (!userId || !prizeType) {
      return NextResponse.json(
        { error: 'userId et prizeType requis' },
        { status: 400 }
      );
    }

    // Générer un code unique
    const generateUniqueCode = () => {
      const prefix = 'ROULETTE';
      const random = Math.random().toString(36).substring(2, 8).toUpperCase();
      return `${prefix}${random}`;
    };

    let code = generateUniqueCode();
    let attempts = 0;
    
    // Vérifier l'unicité (max 10 tentatives)
    while (attempts < 10) {
      const { data: existing } = await supabaseAdmin
        .from('promo_codes')
        .select('id')
        .eq('code', code)
        .single();
      
      if (!existing) break; // Code unique trouvé
      code = generateUniqueCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { error: 'Impossible de générer un code unique' },
        { status: 500 }
      );
    }

    // Déterminer les paramètres du code selon le type de gain
    let discountType, discountValue, description, minOrderAmount = 0;

    switch (prizeType) {
      case 'discount':
        discountType = 'percentage';
        discountValue = prizeValue || 10;
        description = `Réduction de ${discountValue}% sur votre prochaine commande`;
        minOrderAmount = 15;
        break;
      
      case 'free_delivery':
        discountType = 'free_delivery';
        discountValue = 0;
        description = 'Livraison offerte sur votre prochaine commande';
        minOrderAmount = 15;
        break;
      
      case 'free_dessert':
        discountType = 'fixed';
        discountValue = 5; // Valeur approximative d'un dessert
        description = 'Dessert offert (5€) sur votre prochaine commande';
        minOrderAmount = 20;
        break;
      
      case 'free_order':
        discountType = 'percentage';
        discountValue = 100;
        description = 'Commande offerte ! 100% de réduction';
        minOrderAmount = 0;
        break;
      
      default:
        discountType = 'percentage';
        discountValue = 10;
        description = 'Réduction de 10% sur votre prochaine commande';
    }

    // Date d'expiration : 1 semaine
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + 7);

    // Créer le code promo
    const { data: promoCode, error: createError } = await supabaseAdmin
      .from('promo_codes')
      .insert({
        code,
        description,
        discount_type: discountType,
        discount_value: discountValue,
        min_order_amount: minOrderAmount,
        max_uses: 1, // 1 seule utilisation
        max_uses_per_user: 1, // 1 seule fois par utilisateur
        current_uses: 0,
        valid_from: new Date().toISOString(),
        valid_until: validUntil.toISOString(),
        is_active: true,
        first_order_only: false,
        new_users_only: false
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création code promo:', createError);
      return NextResponse.json(
        { error: 'Erreur lors de la création du code promo' },
        { status: 500 }
      );
    }

    // Enregistrer l'association user -> code promo (pour tracking)
    const { error: linkError } = await supabaseAdmin
      .from('promo_code_usage')
      .insert({
        promo_code_id: promoCode.id,
        user_id: userId,
        order_id: orderId || null,
        discount_amount: 0, // Sera calculé à l'utilisation
        order_amount: 0 // Sera calculé à l'utilisation
      });

    if (linkError) {
      console.error('Erreur lien user-code:', linkError);
      // Ne pas échouer si le lien échoue, le code est créé
    }

    return NextResponse.json({
      success: true,
      code: promoCode.code,
      description: promoCode.description,
      validUntil: promoCode.valid_until,
      discountType: promoCode.discount_type,
      discountValue: promoCode.discount_value
    });

  } catch (error) {
    console.error('Erreur génération code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

