import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

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

    // Générer le contenu de l'email
    const emailContent = generateDeliveryEmailContent(customer, order);

    // Ici vous pouvez intégrer votre service d'email (SendGrid, Mailgun, etc.)
    // Pour l'instant, on simule l'envoi
    console.log('📧 Email de livraison à envoyer:', {
      to: customer.email,
      subject: 'Votre commande a été livrée - CVNeat',
      html: emailContent.html,
      text: emailContent.text
    });

    // TODO: Intégrer un vrai service d'email
    // await sendEmail({
    //   to: customer.email,
    //   subject: 'Votre commande a été livrée - CVNeat',
    //   html: emailContent.html,
    //   text: emailContent.text
    // });

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

function generateDeliveryEmailContent(customer, order) {
  const customerName = customer.full_name || 'Cher client';
  const restaurantName = order.restaurant?.name || 'le restaurant';
  const orderNumber = order.order_number;
  const totalAmount = order.total_amount.toFixed(2);
  const deliveryDate = new Date(order.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const complaintUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.com'}/complaint/${order.id}`;
  const orderUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.com'}/orders/${order.id}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Commande livrée - CVNeat</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1f2937; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
        .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        .button-complaint { background: #dc2626; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 6px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🎉 Commande livrée avec succès !</h1>
        <p>Merci d'avoir choisi CVNeat - Bon appétit !</p>
      </div>
      
      <div class="content">
        <p>Bonjour ${customerName},</p>
        
        <p>Nous avons le plaisir de vous confirmer que votre commande a été livrée avec succès !</p>
        
        <div class="order-details">
          <h3>📋 Détails de votre commande</h3>
          <p><strong>Numéro de commande :</strong> #${orderNumber}</p>
          <p><strong>Restaurant :</strong> ${restaurantName}</p>
          <p><strong>Date de livraison :</strong> ${deliveryDate}</p>
          <p><strong>Adresse de livraison :</strong> ${order.delivery_address}, ${order.delivery_city}</p>
          <p><strong>Montant total :</strong> ${totalAmount}€</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${orderUrl}" class="button">Voir ma commande</a>
          <a href="/restaurants/${order.restaurant_id}/reviews" class="button">Noter le restaurant</a>
        </div>
        
        <div style="background: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 6px; margin: 20px 0;">
          <h4>💡 Besoin d'aide ?</h4>
          <p>Si vous rencontrez un problème avec votre commande, notre équipe support est là pour vous aider.</p>
          <p><strong>Contact :</strong> support@cvneat.com</p>
        </div>
        
        <p>Nous espérons que vous avez apprécié votre commande !</p>
        
        <p>Cordialement,<br>
        L'équipe CVNeat</p>
      </div>
      
      <div class="footer">
        <p>CVNeat - Plateforme de livraison de repas</p>
        <p>Cet email a été envoyé automatiquement suite à la livraison de votre commande.</p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Commande livrée avec succès - CVNeat
    
    Bonjour ${customerName},
    
    Nous avons le plaisir de vous confirmer que votre commande a été livrée avec succès !
    
    Détails de votre commande :
    - Numéro de commande : #${orderNumber}
    - Restaurant : ${restaurantName}
    - Date de livraison : ${deliveryDate}
    - Adresse de livraison : ${order.delivery_address}, ${order.delivery_city}
    - Montant total : ${totalAmount}€
    
    IMPORTANT : Si vous rencontrez un problème avec votre commande, vous avez 48 heures pour nous le signaler.
    
    Signaler un problème : ${complaintUrl}
    Voir ma commande : ${orderUrl}
    
    Nous espérons que vous avez apprécié votre commande !
    
    Cordialement,
    L'équipe CVNeat
  `;

  return { html, text };
}
