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
        // Boisson offerte = pas de code promo, mais un item spécial à livrer
        discountType = 'free_drink';
        discountValue = 0; // Pas de réduction, c'est un item offert
        description = 'Boisson offerte - Une boisson vous sera automatiquement ajoutée à votre prochaine commande';
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
      // Livraison offerte : valable jusqu'au 23 décembre 23h59 de l'année en cours
      const currentYear = new Date().getFullYear();
      const now = new Date();
      
      // Toujours utiliser l'année en cours pour décembre
      // Si on est déjà après le 24 décembre de l'année en cours, utiliser l'année suivante
      const dec24ThisYear = new Date(currentYear, 11, 24); // 24 décembre de l'année en cours
      
      if (now > dec24ThisYear) {
        // On est après le 24 décembre de l'année en cours, donc utiliser l'année suivante
        validUntil.setFullYear(currentYear + 1, 11, 23); // 23 décembre de l'année suivante
      } else {
        // On est avant le 24 décembre, donc on met le 23 décembre de l'année en cours
        validUntil.setFullYear(currentYear, 11, 23); // 23 décembre de l'année en cours
      }
      validUntil.setHours(23, 59, 59, 999);
    } else {
      // Autres gains : 1 semaine
      validUntil.setDate(validUntil.getDate() + 7);
    }

    let promoCode = null;
    let promoCodeId = null;

    // Pour "boisson offerte", on ne crée PAS de code promo de réduction
    // C'est un item spécial qui sera ajouté à la commande
    if (prizeType !== 'free_drink') {
      // Créer le code promo (sauf pour boisson offerte)
      const { data: createdCode, error: createError } = await supabaseAdmin
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

      promoCode = createdCode;
      promoCodeId = createdCode.id;
    }

    // Sauvegarder le gain dans wheel_wins pour que le client puisse le voir
    const { error: wheelWinError } = await supabaseAdmin
      .from('wheel_wins')
      .insert({
        user_id: userId,
        order_id: orderId || null,
        prize_type: prizeType,
        prize_value: prizeType === 'free_drink' ? null : (prizeValue || discountValue),
        promo_code_id: promoCodeId,
        promo_code: prizeType === 'free_drink' ? null : code,
        description: description,
        valid_until: validUntil.toISOString()
      });

    if (wheelWinError) {
      console.error('Erreur sauvegarde gain roue:', wheelWinError);
      // Non bloquant, on continue
    }

    const responseData = {
      success: true,
      code: prizeType === 'free_drink' ? null : (promoCode?.code || code),
      description: description,
      validUntil: validUntil.toISOString(),
      discountType: discountType,
      discountValue: discountValue,
      prizeType: prizeType // Pour que le frontend sache que c'est une boisson offerte
    };
    
    console.log('✅ Code promo généré:', {
      prizeType,
      code: responseData.code,
      description,
      promoCodeId
    });
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Erreur génération code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

