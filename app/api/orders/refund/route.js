import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/orders/refund - Rembourser une commande (ADMIN UNIQUEMENT)
export async function POST(request) {
  try {
    // Vérifier l'authentification et le rôle admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé - Rôle admin requis' }, { status: 403 });
    }

    const { orderId, reason, amount } = await request.json();

    if (!orderId || !reason) {
      return NextResponse.json(
        { error: 'ID commande et raison requis' },
        { status: 400 }
      );
    }

    // Récupérer la commande avec tous les détails
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*, stripe_payment_intent_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // VÉRIFICATION CRITIQUE: Ne pas rembourser si la commande est déjà livrée, en livraison ou annulée
    if (order.statut === 'livree' || order.statut === 'delivered') {
      console.log('⚠️ Remboursement BLOQUÉ: Commande déjà livrée (statut:', order.statut, ')');
      return NextResponse.json(
        { error: 'Cette commande a déjà été livrée et ne peut pas être remboursée automatiquement. Contactez le support pour toute demande de remboursement.' },
        { status: 400 }
      );
    }
    
    if (order.statut === 'en_livraison' || order.statut === 'in_delivery') {
      console.log('⚠️ Remboursement BLOQUÉ: Commande déjà en livraison (statut:', order.statut, ')');
      return NextResponse.json(
        { error: 'Cette commande est déjà en cours de livraison et ne peut pas être remboursée automatiquement. Contactez le support pour toute demande de remboursement.' },
        { status: 400 }
      );
    }
    
    if (order.statut === 'annulee') {
      console.log('⚠️ Remboursement BLOQUÉ: Commande déjà annulée (statut:', order.statut, ')');
      return NextResponse.json(
        { error: 'Cette commande a déjà été annulée' },
        { status: 400 }
      );
    }
    
    // Vérifier aussi si un livreur a accepté la commande (même si pas encore en livraison)
    if (order.livreur_id) {
      console.log('⚠️ Remboursement BLOQUÉ: Commande déjà acceptée par un livreur (livreur_id:', order.livreur_id, ')');
      return NextResponse.json(
        { error: 'Cette commande a déjà été acceptée par un livreur et ne peut pas être remboursée automatiquement. Contactez le support pour toute demande de remboursement.' },
        { status: 400 }
      );
    }

    // IMPORTANT: Calculer le montant total avec les frais de livraison
    // Même si un montant est fourni, on doit vérifier qu'il inclut les frais de livraison
    const deliveryFee = parseFloat(order.frais_livraison || 0);
    let refundAmount;
    
    if (amount) {
      // Si un montant est fourni, vérifier s'il inclut les frais de livraison
      const providedAmount = parseFloat(amount);
      const orderSubtotal = parseFloat(order.total || 0);
      const expectedTotal = orderSubtotal + deliveryFee;
      
      // Si le montant fourni est égal au sous-total (sans frais), ajouter les frais
      if (Math.abs(providedAmount - orderSubtotal) < 0.01) {
        refundAmount = providedAmount + deliveryFee;
        console.log('💰 Montant fourni ne contient pas les frais de livraison, ajout automatique:', {
          providedAmount,
          deliveryFee,
          refundAmount_FINAL: refundAmount
        });
      } else if (providedAmount >= expectedTotal - 0.01) {
        // Le montant fourni inclut déjà les frais (ou est supérieur)
        refundAmount = providedAmount;
      } else {
        // Le montant fourni est inférieur au total attendu, ajouter les frais
        refundAmount = providedAmount + deliveryFee;
        console.log('💰 Montant fourni inférieur au total attendu, ajout des frais de livraison:', {
          providedAmount,
          expectedTotal,
          deliveryFee,
          refundAmount_FINAL: refundAmount
        });
      }
    } else {
      // IMPORTANT: Recalculer le sous-total depuis les détails de commande pour inclure les suppléments
      const { data: orderDetails, error: detailsError } = await supabaseAdmin
        .from('details_commande')
        .select('quantite, prix_unitaire, supplements')
        .eq('commande_id', orderId);
      
      let calculatedSubtotal = 0;
      if (!detailsError && orderDetails && orderDetails.length > 0) {
        // Calculer le sous-total depuis les détails
        // IMPORTANT: prix_unitaire contient déjà les suppléments
        orderDetails.forEach(detail => {
          const prixUnitaire = parseFloat(detail.prix_unitaire || 0);
          const quantity = parseFloat(detail.quantite || 1);
          calculatedSubtotal += prixUnitaire * quantity;
        });
      } else {
        // Fallback : utiliser order.total si pas de détails
        calculatedSubtotal = parseFloat(order.total || 0);
      }
      
      // IMPORTANT: Le remboursement doit inclure les frais de livraison
      // deliveryFee est déjà défini ci-dessus
      const calculatedTotal = calculatedSubtotal + deliveryFee;
      const dbTotal = parseFloat(order.total || 0) + deliveryFee;
      
      // Utiliser le maximum pour s'assurer qu'on rembourse tout
      refundAmount = Math.max(calculatedTotal, dbTotal);
      
      // Si aucun des deux n'est valide, utiliser au minimum order.total + deliveryFee
      if (refundAmount <= 0 && order.total > 0) {
        refundAmount = parseFloat(order.total || 0) + deliveryFee;
      }
      
      console.log('💰 Calcul remboursement:', {
        calculatedSubtotal,
        deliveryFee,
        calculatedTotal,
        dbTotal,
        refundAmount_FINAL: refundAmount
      });
    }

    // Créer le remboursement Stripe
    let refund;
    if (order.stripe_payment_intent_id) {
      try {
        refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: orderId,
            reason: reason
          }
        });
        console.log('✅ Remboursement Stripe créé:', refund.id);
      } catch (stripeError) {
        console.error('Erreur Stripe remboursement:', stripeError);
        return NextResponse.json(
          { error: 'Erreur lors du remboursement Stripe' },
          { status: 500 }
        );
      }
    }

    // Mettre à jour la commande
    const { error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: 'annulee',
        cancellation_reason: reason,
        refund_amount: refundAmount,
        stripe_refund_id: refund?.id || null,
        refunded_at: new Date().toISOString(),
        payment_status: refund ? 'refunded' : order.payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Erreur mise à jour commande:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la commande' },
        { status: 500 }
      );
    }

    // Mettre à jour le statut de paiement si la table paiements existe
    try {
      const { error: paymentError } = await supabaseAdmin
        .from('paiements')
        .update({
          status: 'rembourse',
          refund_id: refund?.id || null,
          refunded_at: new Date().toISOString()
        })
        .eq('commande_id', orderId);

      if (paymentError) {
        console.warn('⚠️ Erreur mise à jour paiement (table peut ne pas exister):', paymentError);
      }
    } catch (error) {
      console.warn('⚠️ Table paiements peut ne pas exister:', error);
    }

    // Notifier le client
    await notifyCustomerRefund(orderId, refundAmount, reason);

    return NextResponse.json({
      success: true,
      message: 'Remboursement effectué avec succès',
      refund: {
        id: refund?.id,
        amount: refundAmount,
        reason: reason
      }
    });

  } catch (error) {
    console.error('Erreur remboursement:', error);
    return NextResponse.json(
      { error: 'Erreur serveur lors du remboursement' },
      { status: 500 }
    );
  }
}

// Fonction pour notifier le client du remboursement
async function notifyCustomerRefund(orderId, amount, reason) {
  try {
    // Récupérer les infos du client
    const { data: order } = await supabase
      .from('commandes')
      .select('customer_email, customer_name, customer_phone')
      .eq('id', orderId)
      .single();

    if (!order) return;

    // Envoyer une notification (email, SMS, push, etc.)
    console.log(`📧 Notification remboursement envoyée à ${order.customer_email}`);
    console.log(`💰 Montant remboursé: ${amount}€`);
    console.log(`📝 Raison: ${reason}`);

    // Ici vous pouvez intégrer un service d'email/SMS
    // await sendRefundEmail(order.customer_email, amount, reason);
    // await sendRefundSMS(order.customer_phone, amount, reason);

  } catch (error) {
    console.error('Erreur notification remboursement:', error);
  }
}
