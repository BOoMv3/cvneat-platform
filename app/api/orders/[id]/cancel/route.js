import { NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(request, { params }) {
  try {
    const { id } = params;

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token d\'authentification requis' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*')
      .eq('id', id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier le rôle de l'utilisateur
    const { data: userData, error: userDataError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Les admins peuvent annuler toutes les commandes
    const isAdmin = userData && userData.role === 'admin';

    // Vérifier que la commande appartient à l'utilisateur (sauf si admin)
    if (!isAdmin && order.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à annuler cette commande' }, { status: 403 });
    }

    // Vérifier que la commande peut être annulée (seulement en attente ou en préparation)
    if (order.statut !== 'en_attente' && order.statut !== 'en_preparation') {
      return NextResponse.json({ 
        error: 'Cette commande ne peut plus être annulée', 
        current_status: order.statut 
      }, { status: 400 });
    }

    // Vérifier qu'aucun livreur n'a accepté la commande
    if (order.livreur_id) {
      return NextResponse.json({ 
        error: 'Cette commande a déjà été acceptée par un livreur et ne peut plus être annulée',
        delivery_id: order.livreur_id
      }, { status: 400 });
    }

    // Vérifier si la commande a été payée et nécessite un remboursement
    let refundResult = null;
    const orderTotal = parseFloat(order.total || 0);
    const needsRefund = order.payment_status === 'paid' && order.stripe_payment_intent_id && orderTotal > 0;

    if (needsRefund) {
      console.log('💰 Remboursement automatique nécessaire pour la commande:', id);
      
      try {
        // Créer le remboursement Stripe
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(orderTotal * 100), // Stripe utilise les centimes
          reason: 'requested_by_customer',
          metadata: {
            order_id: id,
            cancellation_reason: 'Commande annulée par le client',
            user_id: order.user_id
          }
        });

        console.log('✅ Remboursement Stripe créé:', refund.id);

        refundResult = {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          created: refund.created
        };

        // Mettre à jour la commande avec les informations du remboursement
        const { data: updatedOrderWithRefund, error: updateRefundError } = await supabaseAdmin
          .from('commandes')
          .update({
            statut: 'annulee',
            payment_status: 'refunded',
            stripe_refund_id: refund.id,
            refund_amount: orderTotal,
            refunded_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateRefundError) {
          console.error('⚠️ Erreur mise à jour commande avec remboursement:', updateRefundError);
          // Ne pas faire échouer la requête, le remboursement Stripe a déjà été créé
        }

        // Créer une notification pour le client
        try {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: order.user_id,
              type: 'order_cancelled_refunded',
              title: 'Commande annulée et remboursée',
              message: `Votre commande #${id.slice(0, 8)} a été annulée. Un remboursement de ${orderTotal.toFixed(2)}€ sera visible sur votre compte dans 2-5 jours ouvrables.`,
              data: {
                order_id: id,
                refund_id: refund.id,
                refund_amount: orderTotal
              },
              read: false,
              created_at: new Date().toISOString()
            });
          
          console.log('✅ Notification de remboursement créée');
        } catch (notificationError) {
          console.warn('⚠️ Erreur création notification:', notificationError);
        }

      } catch (stripeError) {
        console.error('❌ Erreur remboursement Stripe:', stripeError);
        
        // Si le remboursement échoue, on annule quand même la commande
        // mais on retourne un avertissement
        const { data: updatedOrder, error: updateError } = await supabaseAdmin
          .from('commandes')
          .update({
            statut: 'annulee',
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Erreur lors de l\'annulation:', updateError);
          return NextResponse.json({ error: 'Erreur lors de l\'annulation de la commande' }, { status: 500 });
        }

        return NextResponse.json({
          message: 'Commande annulée, mais le remboursement automatique a échoué. Veuillez contacter le support.',
          warning: 'Le remboursement devra être traité manuellement',
          order: updatedOrder,
          refundError: stripeError.message
        }, { status: 200 });
      }
    }

    // Annuler la commande (sans remboursement si pas de paiement)
    const { data: updatedOrder, error: updateError } = await supabaseAdmin
      .from('commandes')
      .update({
        statut: 'annulee',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Erreur lors de l\'annulation:', updateError);
      return NextResponse.json({ error: 'Erreur lors de l\'annulation de la commande' }, { status: 500 });
    }

    return NextResponse.json({
      message: needsRefund 
        ? 'Commande annulée et remboursement effectué avec succès' 
        : 'Commande annulée avec succès',
      order: updatedOrder,
      refund: refundResult
    });

  } catch (error) {
    console.error('Erreur générale lors de l\'annulation:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'annulation de la commande' }, { status: 500 });
  }
}

