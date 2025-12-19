import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request, { params }) {
  try {
    const { id: orderId } = params;
    const { reason, amount } = await request.json();

    // Vérifier l'authentification
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    // Utiliser un client admin pour contourner RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Récupérer la commande
    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select('*, restaurant:restaurants(id, nom)')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    // Vérifier que la commande appartient à l'utilisateur
    if (order.user_id !== user.id) {
      return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à demander un remboursement pour cette commande' }, { status: 403 });
    }

    // Vérifier que la commande est livrée
    if (order.statut !== 'livree' && order.statut !== 'delivered') {
      return NextResponse.json({ 
        error: 'Seules les commandes livrées peuvent être remboursées' 
      }, { status: 400 });
    }

    // Vérifier qu'il n'y a pas déjà un remboursement en cours
    const { data: existingRefund, error: refundCheckError } = await supabaseAdmin
      .from('refund_requests')
      .select('id, status')
      .eq('order_id', orderId)
      .in('status', ['pending', 'approved', 'processing'])
      .single();

    if (existingRefund && !refundCheckError) {
      return NextResponse.json({ 
        error: 'Une demande de remboursement est déjà en cours pour cette commande' 
      }, { status: 400 });
    }

    // Vérifier le délai (max 48h après livraison)
    const deliveredTime = new Date(order.updated_at || order.created_at);
    const now = new Date();
    const hoursDiff = (now - deliveredTime) / (1000 * 60 * 60);

    if (hoursDiff > 48) {
      return NextResponse.json({ 
        error: 'Le délai de remboursement est dépassé (48h maximum après la livraison)' 
      }, { status: 400 });
    }

    // IMPORTANT: Calculer le montant de remboursement avec les frais de livraison
    // order.total contient uniquement les articles, il faut ajouter les frais de livraison
    const orderSubtotal = parseFloat(order.total || 0);
    const deliveryFee = parseFloat(order.frais_livraison || 0);
    const orderTotal = orderSubtotal + deliveryFee; // Total réel payé par le client
    
    // Si un montant spécifique est fourni, s'assurer qu'il n'excède pas le total avec frais
    // Sinon, utiliser le total complet (articles + frais de livraison)
    const refundAmount = amount 
      ? Math.min(parseFloat(amount), orderTotal) 
      : orderTotal;

    if (refundAmount <= 0 || refundAmount > orderTotal) {
      return NextResponse.json({ 
        error: `Montant de remboursement invalide. Le montant maximum remboursable est ${orderTotal.toFixed(2)}€ (articles: ${orderSubtotal.toFixed(2)}€ + frais de livraison: ${deliveryFee.toFixed(2)}€)` 
      }, { status: 400 });
    }
    
    console.log('💰 Calcul remboursement demande:', {
      orderSubtotal,
      deliveryFee,
      orderTotal,
      refundAmount_FINAL: refundAmount
    });

    // Vérifier qu'il y a un paiement Stripe
    if (!order.stripe_payment_intent_id) {
      return NextResponse.json({ 
        error: 'Aucun paiement Stripe trouvé pour cette commande. Contactez contact@cvneat.fr' 
      }, { status: 400 });
    }

    // Créer la demande de remboursement
    const { data: refundRequest, error: createError } = await supabaseAdmin
      .from('refund_requests')
      .insert({
        order_id: orderId,
        user_id: user.id,
        restaurant_id: order.restaurant_id,
        amount: refundAmount,
        reason: reason || 'Demande de remboursement client',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError) {
      console.error('Erreur création demande remboursement:', createError);
      return NextResponse.json({ 
        error: 'Erreur lors de la création de la demande de remboursement' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Demande de remboursement créée avec succès. Elle sera traitée par notre équipe dans les plus brefs délais.',
      refundRequest: {
        id: refundRequest.id,
        amount: refundAmount,
        status: refundRequest.status
      }
    });

  } catch (error) {
    console.error('Erreur API demande remboursement:', error);
    return NextResponse.json({ 
      error: 'Erreur serveur' 
    }, { status: 500 });
  }
}

