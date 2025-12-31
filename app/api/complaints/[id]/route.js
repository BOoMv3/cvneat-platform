import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Créer un client admin pour bypasser RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/complaints/[id] - Récupérer une réclamation spécifique
export async function GET(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier le rôle de l'utilisateur
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError) {
      return NextResponse.json({ error: 'Erreur utilisateur' }, { status: 500 });
    }

    const { data: complaint, error } = await supabase
      .from('complaints')
      .select(`
        *,
        order:orders(
          id,
          order_number,
          total_amount,
          status,
          created_at,
          items
        ),
        customer:users!customer_id(
          id,
          email,
          full_name,
          telephone
        ),
        restaurant:restaurants!restaurant_id(
          id,
          nom,
          adresse,
          telephone
        ),
        evidence:complaint_evidence(*)
      `)
      .eq('id', params.id)
      .single();

    if (error || !complaint) {
      return NextResponse.json(
        { error: 'Réclamation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier les permissions
    if (userData.role === 'admin') {
      // Admin peut voir toutes les réclamations
    } else if (userData.role === 'restaurant') {
      // Restaurant peut voir ses réclamations
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!restaurant || complaint.restaurant_id !== restaurant.id) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    } else {
      // Client peut voir ses propres réclamations
      if (complaint.customer_id !== user.id) {
        return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
      }
    }

    return NextResponse.json(complaint);

  } catch (error) {
    console.error('Erreur API réclamation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// PUT /api/complaints/[id] - Mettre à jour une réclamation (admin seulement)
export async function PUT(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    const {
      status,
      adminDecision,
      finalRefundAmount,
      adminResponse,
      adminNotes
    } = await request.json();

    // Récupérer la réclamation actuelle avec les détails de la commande
    const { data: complaint, error: complaintError } = await supabaseAdmin
      .from('complaints')
      .select(`
        *,
        order:commandes(
          id,
          total,
          frais_livraison,
          stripe_payment_intent_id,
          user_id
        ),
        customer:users!customer_id(email, full_name)
      `)
      .eq('id', params.id)
      .single();

    if (complaintError || !complaint) {
      return NextResponse.json(
        { error: 'Réclamation non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier que la réclamation peut être modifiée
    if (complaint.status === 'resolved') {
      return NextResponse.json(
        { error: 'Cette réclamation est déjà résolue' },
        { status: 400 }
      );
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (status) updateData.status = status;
    if (adminDecision) updateData.admin_decision = adminDecision;
    if (finalRefundAmount !== undefined) updateData.final_refund_amount = finalRefundAmount;
    if (adminResponse) updateData.admin_response = adminResponse;
    if (adminNotes) updateData.admin_notes = adminNotes;

    // Si approuvée, traiter le remboursement
    if (adminDecision === 'approve' || adminDecision === 'partial_refund') {
      // Calculer le montant de remboursement avec les frais de livraison
      let refundAmount;
      
      if (finalRefundAmount !== undefined && finalRefundAmount !== null) {
        // Si un montant final est spécifié, vérifier s'il inclut déjà les frais de livraison
        // Si le montant demandé correspond au total sans frais, on ajoute les frais
        const requestedAmount = parseFloat(complaint.requested_refund_amount || 0);
        const orderTotal = parseFloat(complaint.order?.total || 0);
        const deliveryFee = parseFloat(complaint.order?.frais_livraison || 0);
        const totalWithDelivery = orderTotal + deliveryFee;
        
        // Si le montant final spécifié est égal au total sans frais, ajouter les frais
        if (Math.abs(finalRefundAmount - orderTotal) < 0.01) {
          refundAmount = finalRefundAmount + deliveryFee;
          console.log('💰 Ajout des frais de livraison au remboursement:', {
            finalRefundAmount,
            deliveryFee,
            refundAmount_FINAL: refundAmount
          });
        } else {
          // Sinon, utiliser le montant spécifié tel quel
          refundAmount = finalRefundAmount;
        }
      } else {
        // Si aucun montant final n'est spécifié, utiliser le montant demandé + frais de livraison
        const requestedAmount = parseFloat(complaint.requested_refund_amount || 0);
        const deliveryFee = parseFloat(complaint.order?.frais_livraison || 0);
        refundAmount = requestedAmount + deliveryFee;
        
        console.log('💰 Calcul remboursement avec frais de livraison:', {
          requestedAmount,
          deliveryFee,
          refundAmount_FINAL: refundAmount
        });
      }
      
      // VÉRIFICATION CRITIQUE: Ne pas rembourser si la commande n'est pas livrée
      // Pour les réclamations, on rembourse seulement si la commande est livrée (le client a reçu la commande)
      if (complaint.order?.statut !== 'livree' && complaint.order?.statut !== 'delivered') {
        console.log('⚠️ Remboursement réclamation BLOQUÉ: Commande non livrée (statut:', complaint.order?.statut, ')');
        return NextResponse.json({
          error: 'Une réclamation ne peut être approuvée que pour une commande livrée',
          current_status: complaint.order?.statut
        }, { status: 400 });
      }
      
      try {
        // Créer le remboursement Stripe
        let stripeRefund = null;
        if (complaint.order?.stripe_payment_intent_id) {
          stripeRefund = await stripe.refunds.create({
            payment_intent: complaint.order.stripe_payment_intent_id,
            amount: Math.round(refundAmount * 100), // Stripe utilise les centimes
            reason: 'requested_by_customer',
            metadata: {
              complaint_id: params.id,
              order_id: complaint.order_id,
              reason: 'Réclamation approuvée par l\'admin'
            }
          });
          console.log('✅ Remboursement Stripe créé:', stripeRefund.id);
        }

        // Mettre à jour le statut de la commande
        await supabaseAdmin
          .from('commandes')
          .update({
            statut: 'annulee',
            cancellation_reason: `Réclamation approuvée: ${adminResponse || 'Remboursement effectué'}`,
            refund_amount: refundAmount,
            stripe_refund_id: stripeRefund?.id || null,
            refunded_at: new Date().toISOString(),
            payment_status: stripeRefund ? 'refunded' : 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('id', complaint.order_id);

        // Mettre à jour le statut de paiement si la table existe
        try {
          await supabaseAdmin
            .from('paiements')
            .update({
              status: 'rembourse',
              refund_id: stripeRefund?.id || null,
              refunded_at: new Date().toISOString()
            })
            .eq('commande_id', complaint.order_id);
        } catch (paymentError) {
          console.warn('⚠️ Erreur mise à jour paiement (table peut ne pas exister):', paymentError);
        }

        updateData.status = 'approved';
        updateData.resolved_at = new Date().toISOString();

        // Notifier le client
        try {
          await fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'complaintApproved',
              data: {
                complaintId: params.id,
                orderNumber: complaint.order.order_number,
                refundAmount: refundAmount,
                adminResponse: adminResponse
              },
              recipientEmail: complaint.customer.email
            })
          });
        } catch (notificationError) {
          console.error('Erreur notification client:', notificationError);
        }

      } catch (stripeError) {
        console.error('Erreur remboursement Stripe:', stripeError);
        return NextResponse.json(
          { error: 'Erreur lors du remboursement' },
          { status: 500 }
        );
      }
    } else if (adminDecision === 'reject') {
      updateData.status = 'rejected';
      updateData.resolved_at = new Date().toISOString();

      // Notifier le client
      try {
        await fetch('/api/notifications/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'complaintRejected',
            data: {
              complaintId: params.id,
              orderNumber: complaint.order.order_number,
              adminResponse: adminResponse
            },
            recipientEmail: complaint.customer.email
          })
        });
      } catch (notificationError) {
        console.error('Erreur notification client:', notificationError);
      }
    }

    // Mettre à jour la réclamation
    const { data: updatedComplaint, error: updateError } = await supabase
      .from('complaints')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        order:orders(order_number, total_amount),
        customer:users!customer_id(email, full_name),
        restaurant:restaurants(nom)
      `)
      .single();

    if (updateError) {
      console.error('Erreur mise à jour réclamation:', updateError);
      return NextResponse.json(
        { error: 'Erreur lors de la mise à jour' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      complaint: updatedComplaint,
      message: 'Réclamation mise à jour avec succès'
    });

  } catch (error) {
    console.error('Erreur API mise à jour réclamation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// DELETE /api/complaints/[id] - Supprimer une réclamation (admin seulement)
export async function DELETE(request, { params }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Vérifier que l'utilisateur est admin
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Accès non autorisé' }, { status: 403 });
    }

    // Supprimer la réclamation (les preuves seront supprimées automatiquement via CASCADE)
    const { error } = await supabase
      .from('complaints')
      .delete()
      .eq('id', params.id);

    if (error) {
      console.error('Erreur suppression réclamation:', error);
      return NextResponse.json(
        { error: 'Erreur lors de la suppression' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Réclamation supprimée avec succès'
    });

  } catch (error) {
    console.error('Erreur API suppression réclamation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
