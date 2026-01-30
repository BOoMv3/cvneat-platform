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
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

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
        { status: 400, headers: corsHeaders }
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
        { status: 500, headers: corsHeaders }
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

    // Si c'est un code de la roue (ROULETTE), marquer le gain comme utilisé dans wheel_wins
    const { data: promoCode } = await supabaseAdmin
      .from('promo_codes')
      .select('code, description, discount_type, discount_value')
      .eq('id', promoCodeId)
      .single();

    if (promoCode && promoCode.code && promoCode.code.toUpperCase().startsWith('ROULETTE')) {
      // Récupérer les infos utilisateur pour la notification
      let userEmail = null;
      let userName = null;
      if (userId) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('email, nom, prenom')
          .eq('id', userId)
          .single();
        if (userData) {
          userEmail = userData.email;
          userName = `${userData.prenom || ''} ${userData.nom || ''}`.trim() || userEmail;
        }
      }

      // Marquer le gain comme utilisé dans wheel_wins
      const { error: wheelWinUpdateError } = await supabaseAdmin
        .from('wheel_wins')
        .update({
          used_at: new Date().toISOString(),
          used_in_order_id: orderId
        })
        .eq('promo_code', promoCode.code.toUpperCase())
        .eq('user_id', userId)
        .is('used_at', null); // Seulement si pas encore utilisé

      if (wheelWinUpdateError) {
        console.warn('Erreur mise à jour wheel_wins (non bloquant):', wheelWinUpdateError);
        // Ne pas bloquer si la mise à jour échoue
      } else {
        // Envoyer une notification admin pour informer qu'un code de gain a été utilisé
        try {
          const notificationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr'}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: process.env.ADMIN_EMAIL || 'admin@cvneat.fr',
              subject: '🎰 Code de la roue utilisé !',
              html: `
                <h2>Un client a utilisé un code de la roue de la chance</h2>
                <p><strong>Client:</strong> ${userName || 'Inconnu'} (${userEmail || 'Email non disponible'})</p>
                <p><strong>Code promo:</strong> <code>${promoCode.code}</code></p>
                <p><strong>Gain:</strong> ${promoCode.description || 'Non spécifié'}</p>
                <p><strong>Réduction:</strong> ${promoCode.discount_type === 'percentage' ? `${promoCode.discount_value}%` : promoCode.discount_type === 'free_delivery' ? 'Livraison offerte' : `${promoCode.discount_value}€`}</p>
                <p><strong>Montant de la réduction:</strong> ${parseFloat(discountAmount).toFixed(2)}€</p>
                <p><strong>Commande:</strong> ${orderId}</p>
                <p><strong>Date:</strong> ${new Date().toLocaleString('fr-FR')}</p>
              `,
              text: `
                Un client a utilisé un code de la roue de la chance
                Client: ${userName || 'Inconnu'} (${userEmail || 'Email non disponible'})
                Code promo: ${promoCode.code}
                Gain: ${promoCode.description || 'Non spécifié'}
                Réduction: ${promoCode.discount_type === 'percentage' ? `${promoCode.discount_value}%` : promoCode.discount_type === 'free_delivery' ? 'Livraison offerte' : `${promoCode.discount_value}€`}
                Montant de la réduction: ${parseFloat(discountAmount).toFixed(2)}€
                Commande: ${orderId}
                Date: ${new Date().toLocaleString('fr-FR')}
              `
            })
          });

          if (notificationResponse.ok) {
            console.log('✅ Notification admin envoyée pour utilisation code roue');
          } else {
            console.warn('⚠️ Erreur envoi notification admin (non bloquant)');
          }
        } catch (notifError) {
          console.warn('⚠️ Erreur notification admin (non bloquant):', notifError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      usageId: usage.id
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('Erreur API application code promo:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500, headers: corsHeaders }
    );
  }
}

