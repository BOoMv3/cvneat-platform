import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import emailService from '../../../../lib/emailService';

// POST /api/email/delivery-completed - Envoyer email après livraison
export async function POST(request) {
  try {
    const { customerId, orderId } = await request.json();

    if (!customerId || !orderId) {
      return NextResponse.json(
        { error: 'customerId et orderId requis' },
        { status: 400 }
      );
    }

    // Récupérer les informations du client
    const { data: customer, error: customerError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    // Récupérer les détails de la commande
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_number,
        total_amount,
        created_at,
        delivery_address,
        delivery_city,
        restaurant:restaurants(name, email)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { error: 'Commande non trouvée' },
        { status: 404 }
      );
    }

    // Utiliser le service d'email configuré
    const template = emailService.getTemplates().deliveryCompleted({
      customerName: customer.full_name || 'Cher client',
      orderNumber: order.order_number,
      restaurantName: order.restaurant?.name || 'le restaurant',
      totalAmount: order.total_amount.toFixed(2),
      orderUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.com'}/orders/${order.id}`,
      feedbackUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.com'}/orders/${order.id}/feedback`
    });

    await emailService.sendEmail({
      to: customer.email,
      subject: template.subject,
      html: template.html,
      text: template.text
    });

    return NextResponse.json({
      success: true,
      message: 'Email de livraison préparé',
      email: {
        to: customer.email,
        subject: 'Votre commande a été livrée - CVNeat'
      }
    });

  } catch (error) {
    console.error('Erreur email livraison:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

