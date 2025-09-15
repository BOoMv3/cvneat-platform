import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// POST /api/complaints/proactive-check - Vérifier si une réclamation proactive est nécessaire
export async function POST(request) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: 'orderId requis' },
        { status: 400 }
      );
    }

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        total_amount,
        customer_id,
        restaurant_id,
        created_at,
        restaurant:restaurants(name, email),
        customer:users(email, full_name)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Vérifier si la commande est livrée
    if (order.status !== 'delivered') {
      return NextResponse.json({
        needsProactiveCheck: false,
        reason: 'Commande non livrée'
      });
    }

    // Vérifier si une réclamation existe déjà
    const { data: existingComplaint } = await supabase
      .from('complaints')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingComplaint) {
      return NextResponse.json({
        needsProactiveCheck: false,
        reason: 'Réclamation déjà existante'
      });
    }

    // Déclencher une vérification proactive après 24h (au lieu d'attendre 48h)
    const orderTime = new Date(order.created_at);
    const now = new Date();
    const hoursSinceDelivery = (now - orderTime) / (1000 * 60 * 60);

    // Si plus de 24h et moins de 48h, envoyer un message de suivi
    if (hoursSinceDelivery >= 24 && hoursSinceDelivery <= 48) {
      await sendProactiveFollowUp(order);
      
      return NextResponse.json({
        needsProactiveCheck: true,
        action: 'follow_up_sent',
        message: 'Message de suivi envoyé'
      });
    }

    return NextResponse.json({
      needsProactiveCheck: false,
      reason: 'Pas encore le moment (24h)'
    });

  } catch (error) {
    console.error('Erreur vérification proactive:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

async function sendProactiveFollowUp(order) {
  try {
    // Créer une notification de suivi (pas de réclamation)
    const followUpNotification = {
      user_id: order.customer_id,
      type: 'order_follow_up',
      title: 'Comment s\'est passée votre commande ? 😊',
      message: `Nous espérons que vous avez apprécié votre commande #${order.order_number} de ${order.restaurant?.name}. N'hésitez pas à nous faire part de vos commentaires !`,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        restaurant_name: order.restaurant?.name,
        feedback_url: `/orders/${order.id}/feedback`,
        review_url: `/restaurants/${order.restaurant_id}/reviews`
      },
      read: false,
      created_at: new Date().toISOString()
    };

    // Sauvegarder la notification
    await supabase
      .from('notifications')
      .insert([followUpNotification]);

    console.log('✅ Message de suivi envoyé pour la commande', order.order_number);

  } catch (error) {
    console.error('Erreur envoi suivi:', error);
  }
}
