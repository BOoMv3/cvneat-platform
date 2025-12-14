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
        description = 'Livraison offerte sur votre prochaine commande (valable avant le 24 décembre)';
        minOrderAmount = 15;
        break;
      
      case 'free_drink':
        discountType = 'fixed';
        discountValue = 3; // Valeur approximative d'une boisson
        description = 'Boisson offerte (3€) sur votre prochaine commande';
        minOrderAmount = 15;
        break;
      
      case 'surprise':
        // Surprise = tirage aléatoire entre plusieurs petits gains
        const surprises = [
          { type: 'fixed', value: 2, desc: 'Réduction surprise de 2€' },
          { type: 'fixed', value: 3, desc: 'Réduction surprise de 3€' },
          { type: 'percentage', value: 5, desc: 'Réduction surprise de 5%' },
        ];
        const surprise = surprises[Math.floor(Math.random() * surprises.length)];
        discountType = surprise.type;
        discountValue = surprise.value;
        description = `${surprise.desc} sur votre prochaine commande`;
        minOrderAmount = 15;
        break;
      
      default:
        discountType = 'percentage';
        discountValue = 10;
        description = 'Réduction de 10% sur votre prochaine commande';
    }

    // Date d'expiration : 1 semaine (sauf livraison offerte = avant le 24 décembre)
    const validUntil = new Date();
    if (prizeType === 'free_delivery') {
      // Livraison offerte : valable jusqu'au 23 décembre 23h59
      validUntil.setFullYear(2024, 11, 23); // 11 = décembre (0-indexé)
      validUntil.setHours(23, 59, 59, 999);
    } else {
      // Autres gains : 1 semaine
      validUntil.setDate(validUntil.getDate() + 7);
    }

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

    // Note: On ne crée PAS d'entrée dans promo_code_usage ici
    // car cela compterait comme une utilisation. L'entrée sera créée
    // uniquement quand le code sera réellement utilisé lors d'une commande.

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

