import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '../../../../lib/supabase';
import emailService from '../../../../lib/emailService';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/stripe/refund - Créer un remboursement Stripe
export async function POST(request) {
  try {
    const { complaintId, amount, reason } = await request.json();

    if (!complaintId || !amount) {
      return NextResponse.json(
        { error: 'complaintId et amount requis' },
        { status: 400 }
      );
    }

    // Vérifier l'authentification admin
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\'authentification requis' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Token invalide' },
        { status: 401 }
      );
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData.role !== 'admin') {
      return NextResponse.json(
        { error: 'Accès refusé - Rôle admin requis' },
        { status: 403 }
      );
    }

    // Récupérer les détails de la réclamation
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select(`
        *,
        order:orders(
          id,
          order_number,
          stripe_payment_intent_id,
          customer_id,
          total_amount
        ),
        customer:users!customer_id(
          id,
          email,
          full_name
        )
      `)
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json(
        { error: 'Réclamation non trouvée' },
        { status: 404 }
      );
    }

    if (complaint.status !== 'approved') {
      return NextResponse.json(
        { error: 'Seules les réclamations approuvées peuvent être remboursées' },
        { status: 400 }
      );
    }

    if (!complaint.order.stripe_payment_intent_id) {
      return NextResponse.json(
        { error: 'Aucun paiement Stripe trouvé pour cette commande' },
        { status: 400 }
      );
    }

    // Vérifier que le montant ne dépasse pas le total de la commande
    const maxRefundAmount = complaint.order.total_amount;
    if (amount > maxRefundAmount) {
      return NextResponse.json(
        { error: `Le montant du remboursement ne peut pas dépasser ${maxRefundAmount}€` },
        { status: 400 }
      );
    }

    // Créer le remboursement Stripe
    const refund = await stripe.refunds.create({
      payment_intent: complaint.order.stripe_payment_intent_id,
      amount: Math.round(amount * 100), // Convertir en centimes
      reason: reason || 'requested_by_customer',
      metadata: {
        complaint_id: complaintId,
        order_number: complaint.order.order_number,
        customer_id: complaint.customer.id
      }
    });

    console.log('💰 Remboursement Stripe créé:', refund.id);

    // Mettre à jour la réclamation avec les détails du remboursement
    const { error: updateError } = await supabase
      .from('complaints')
      .update({
        final_refund_amount: amount,
        status: 'approved',
        resolved_at: new Date().toISOString(),
        stripe_refund_id: refund.id,
        stripe_refund_status: refund.status,
        updated_at: new Date().toISOString()
      })
      .eq('id', complaintId);

    if (updateError) {
      console.error('❌ Erreur mise à jour réclamation:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour de la réclamation' },
        { status: 500 }
      );
    }

    // Envoyer un email de confirmation au client
    try {
      const template = emailService.getTemplates().complaintResolved({
        customerName: complaint.customer.full_name || 'Cher client',
        complaintTitle: complaint.title,
        orderNumber: complaint.order.order_number,
        status: 'approved',
        refundAmount: amount
      });

      await emailService.sendEmail({
        to: complaint.customer.email,
        subject: template.subject,
        html: template.html,
        text: template.text
      });

      console.log('✅ Email de confirmation de remboursement envoyé');
    } catch (emailError) {
      console.warn('⚠️ Erreur envoi email confirmation:', emailError);
      // Ne pas faire échouer la requête si l'email échoue
    }

    // Créer une notification pour le client
    try {
      await supabase
        .from('notifications')
        .insert([{
          user_id: complaint.customer.id,
          type: 'refund_processed',
          title: 'Remboursement traité',
          message: `Votre remboursement de ${amount}€ pour la commande #${complaint.order.order_number} a été traité. Il sera visible sur votre compte dans 2-5 jours ouvrables.`,
          data: {
            complaint_id: complaintId,
            order_number: complaint.order.order_number,
            refund_amount: amount,
            refund_id: refund.id
          },
          read: false,
          created_at: new Date().toISOString()
        }]);

      console.log('✅ Notification remboursement créée');
    } catch (notificationError) {
      console.warn('⚠️ Erreur création notification:', notificationError);
    }

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: amount,
        status: refund.status,
        created: refund.created
      },
      message: 'Remboursement créé avec succès'
    });

  } catch (error) {
    console.error('❌ Erreur création remboursement:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Erreur Stripe: ' + error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// GET /api/stripe/refund - Récupérer les détails d'un remboursement
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const refundId = searchParams.get('refund_id');
    const complaintId = searchParams.get('complaint_id');

    if (!refundId && !complaintId) {
      return NextResponse.json(
        { error: 'refund_id ou complaint_id requis' },
        { status: 400 }
      );
    }

    let stripeRefundId = refundId;

    // Si on a seulement l'ID de réclamation, récupérer l'ID de remboursement Stripe
    if (!stripeRefundId && complaintId) {
      const { data: complaint, error: complaintError } = await supabase
        .from('complaints')
        .select('stripe_refund_id')
        .eq('id', complaintId)
        .single();

      if (complaintError || !complaint) {
        return NextResponse.json(
          { error: 'Réclamation non trouvée' },
          { status: 404 }
        );
      }

      stripeRefundId = complaint.stripe_refund_id;
    }

    if (!stripeRefundId) {
      return NextResponse.json(
        { error: 'Aucun remboursement Stripe trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les détails du remboursement depuis Stripe
    const refund = await stripe.refunds.retrieve(stripeRefundId);

    return NextResponse.json({
      success: true,
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status,
        reason: refund.reason,
        created: refund.created,
        metadata: refund.metadata
      }
    });

  } catch (error) {
    console.error('❌ Erreur récupération remboursement:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        { error: 'Remboursement non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}
