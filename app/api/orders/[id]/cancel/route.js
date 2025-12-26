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

    // VÉRIFICATION CRITIQUE: Ne pas rembourser si la commande est déjà acceptée par un livreur ou livrée
    if (order.livreur_id) {
      console.log('⚠️ Annulation BLOQUÉE: Commande déjà acceptée par un livreur (ID:', order.livreur_id, ')');
      return NextResponse.json({ 
        error: 'Cette commande a déjà été acceptée par un livreur et ne peut plus être annulée automatiquement. Contactez le support pour toute demande de remboursement.',
        delivery_id: order.livreur_id,
        current_statut: order.statut
      }, { status: 400 });
    }
    
    if (order.statut === 'livree' || order.statut === 'delivered') {
      console.log('⚠️ Annulation BLOQUÉE: Commande déjà livrée (statut:', order.statut, ')');
      return NextResponse.json({ 
        error: 'Cette commande a déjà été livrée et ne peut plus être annulée. Contactez le support pour toute demande de remboursement.',
        current_statut: order.statut
      }, { status: 400 });
    }

    // Vérifier si la commande a été payée et nécessite un remboursement
    let refundResult = null;
    
    // IMPORTANT: Recalculer le sous-total depuis les détails de commande pour inclure les suppléments
    // Récupérer les détails de commande avec suppléments
    const { data: orderDetails, error: detailsError } = await supabaseAdmin
      .from('details_commande')
      .select('quantite, prix_unitaire, supplements')
      .eq('commande_id', id);
    
    let calculatedSubtotal = 0;
    if (!detailsError && orderDetails && orderDetails.length > 0) {
      // Calculer le sous-total depuis les détails
      // IMPORTANT: prix_unitaire DOIT contenir les suppléments (voir checkout/page.js ligne 570)
      // Mais pour être sûr, on vérifie aussi la colonne supplements
      orderDetails.forEach(detail => {
        let prixUnitaire = parseFloat(detail.prix_unitaire || 0);
        
        // Vérifier si les suppléments sont déjà inclus dans prix_unitaire
        // Si prix_unitaire semble trop bas comparé aux suppléments, on les ajoute
        let supplementsPrice = 0;
        if (detail.supplements) {
          let supplements = [];
          if (typeof detail.supplements === 'string') {
            try {
              supplements = JSON.parse(detail.supplements);
            } catch (e) {
              supplements = [];
            }
          } else if (Array.isArray(detail.supplements)) {
            supplements = detail.supplements;
          }
          supplementsPrice = supplements.reduce((sum, sup) => {
            return sum + (parseFloat(sup.prix || sup.price || 0) || 0);
          }, 0);
        }
        
        // Si prix_unitaire est très proche de 0 mais qu'il y a des suppléments, 
        // c'est qu'il faut les ajouter (anciennes commandes)
        // Sinon, on fait confiance à prix_unitaire qui devrait déjà tout contenir
        const quantity = parseFloat(detail.quantite || 1);
        
        // Utiliser prix_unitaire si > 0, sinon utiliser suppléments
        // En théorie prix_unitaire devrait déjà tout contenir, mais on vérifie
        if (prixUnitaire > 0) {
          calculatedSubtotal += prixUnitaire * quantity;
        } else if (supplementsPrice > 0) {
          // Fallback : si prix_unitaire est 0 mais qu'il y a des suppléments
          calculatedSubtotal += supplementsPrice * quantity;
        }
      });
      
      console.log('💰 Calcul sous-total depuis détails:', {
        detailsCount: orderDetails.length,
        calculatedSubtotal,
        orderTotalInDB: order.total
      });
    } else {
      // Fallback : utiliser order.total si pas de détails
      // order.total contient déjà les articles + suppléments (sans frais de livraison)
      calculatedSubtotal = parseFloat(order.total || 0);
      console.log('💰 Utilisation order.total comme fallback:', calculatedSubtotal);
    }
    
    // IMPORTANT: Le remboursement doit inclure les frais de livraison car ils n'ont pas été effectués
    const deliveryFee = parseFloat(order.frais_livraison || 0); // Frais de livraison
    
    // S'assurer que calculatedSubtotal n'est pas 0 (utiliser order.total comme fallback)
    if (calculatedSubtotal === 0 && order.total > 0) {
      console.log('⚠️ CalculatedSubtotal est 0, utilisation de order.total comme fallback');
      calculatedSubtotal = parseFloat(order.total || 0);
    }
    
    // CALCUL FINAL DU REMBOURSEMENT
    // Le total payé = sous-total (articles + suppléments) + frais de livraison
    // On utilise le maximum entre :
    // 1. calculatedSubtotal + deliveryFee (calculé depuis les détails)
    // 2. order.total + deliveryFee (depuis la base de données)
    // Pour s'assurer qu'on rembourse toujours le montant complet
    const calculatedTotal = calculatedSubtotal + deliveryFee;
    const dbTotal = parseFloat(order.total || 0) + deliveryFee;
    
    // Utiliser le maximum pour s'assurer qu'on rembourse tout
    let orderTotal = Math.max(calculatedTotal, dbTotal);
    
    // Si aucun des deux n'est valide, utiliser au minimum order.total + deliveryFee
    if (orderTotal <= 0 && order.total > 0) {
      orderTotal = parseFloat(order.total || 0) + deliveryFee;
    }
    
    const needsRefund = order.payment_status === 'paid' && order.stripe_payment_intent_id && orderTotal > 0;

    if (needsRefund) {
      console.log('💰 Remboursement automatique nécessaire pour la commande:', id);
      console.log('💰 Calcul du remboursement:', {
        calculatedSubtotal,
        deliveryFee,
        calculatedTotal,
        order_total_BD: order.total,
        dbTotal,
        orderTotal_FINAL: orderTotal,
        order_frais_livraison_BD: order.frais_livraison
      });
      
      try {
        // Créer le remboursement Stripe (incluant les frais de livraison)
        const refund = await stripe.refunds.create({
          payment_intent: order.stripe_payment_intent_id,
          amount: Math.round(orderTotal * 100), // Stripe utilise les centimes - TOTAL avec frais
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
              message: `Votre commande #${id.slice(0, 8)} a été annulée. Un remboursement de ${orderTotal.toFixed(2)}€ (articles avec suppléments: ${calculatedSubtotal.toFixed(2)}€ + frais de livraison: ${deliveryFee.toFixed(2)}€) sera visible sur votre compte dans 2-5 jours ouvrables.`,
              data: {
                order_id: id,
                refund_id: refund.id,
                refund_amount: orderTotal,
                refund_subtotal: calculatedSubtotal,
                refund_delivery_fee: deliveryFee
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
          message: 'Commande annulée, mais le remboursement automatique a échoué. Veuillez contacter contact@cvneat.fr',
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

