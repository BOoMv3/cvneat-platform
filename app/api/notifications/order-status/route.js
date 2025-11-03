import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createClient } from '@supabase/supabase-js';

// Service d'email simple (peut être remplacé par SendGrid, etc.)
async function sendEmail(to, subject, html) {
  try {
    // Utiliser le service d'email configuré
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'orderStatusUpdate',
        data: { subject, html },
        recipientEmail: to
      })
    });
    return response.ok;
  } catch (error) {
    console.error('Erreur envoi email:', error);
    return false;
  }
}

// Envoyer notification WhatsApp (via API externe si disponible)
async function sendWhatsApp(to, message) {
  try {
    // Si WhatsApp Business API est configuré
    if (process.env.WHATSAPP_API_KEY && process.env.WHATSAPP_PHONE_ID) {
      const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.WHATSAPP_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''), // Nettoyer le numéro
          type: 'text',
          text: { body: message }
        })
      });
      return response.ok;
    }
    return false;
  } catch (error) {
    console.error('Erreur envoi WhatsApp:', error);
    return false;
  }
}

// Templates d'emails en français
const emailTemplates = {
  orderAccepted: (order) => ({
    subject: `✅ Votre commande #${order.id.slice(0, 8)} a été acceptée !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>✅ Commande acceptée !</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Nous avons le plaisir de vous informer que votre commande a été <strong>acceptée</strong> par le restaurant <strong>${order.restaurantName || 'le restaurant'}</strong>.</p>
          
          <div class="order-details">
            <h3>📋 Détails de votre commande</h3>
            <p><strong>Numéro de commande :</strong> #${order.id.slice(0, 8)}</p>
            <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
            <p><strong>Montant total :</strong> ${(order.total || 0).toFixed(2)}€</p>
            ${order.preparationTime ? `<p><strong>Temps de préparation estimé :</strong> ${order.preparationTime} minutes</p>` : ''}
          </div>
          
          <p>Votre commande est maintenant en cours de préparation. Vous recevrez une notification dès qu'elle sera prête à être livrée.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}" class="button">
              Suivre ma commande
            </a>
          </div>
          
          <p>Merci de votre confiance !</p>
          <p>L'équipe CVN'Eat</p>
        </div>
        <div class="footer">
          <p>CVN'Eat - Livraison de repas à domicile</p>
        </div>
      </body>
      </html>
    `,
    whatsapp: `✅ Commande acceptée !\n\nVotre commande #${order.id.slice(0, 8)} a été acceptée par ${order.restaurantName || 'le restaurant'}.\n\nMontant: ${(order.total || 0).toFixed(2)}€${order.preparationTime ? `\nTemps de préparation: ${order.preparationTime} min` : ''}\n\nSuivez votre commande: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}`
  }),

  orderRejected: (order) => ({
    subject: `❌ Votre commande #${order.id.slice(0, 8)} n'a pas pu être acceptée`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #ef4444; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>❌ Commande refusée</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Nous sommes désolés de vous informer que votre commande n'a <strong>pas pu être acceptée</strong> par le restaurant <strong>${order.restaurantName || 'le restaurant'}</strong>.</p>
          
          ${order.rejectionReason ? `
          <div class="order-details">
            <h3>📋 Raison du refus</h3>
            <p>${order.rejectionReason}</p>
          </div>
          ` : ''}
          
          <div class="order-details">
            <h3>📋 Détails de votre commande</h3>
            <p><strong>Numéro de commande :</strong> #${order.id.slice(0, 8)}</p>
            <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
            <p><strong>Montant :</strong> ${(order.total || 0).toFixed(2)}€</p>
          </div>
          
          <p>Votre paiement sera <strong>remboursé automatiquement</strong> dans les plus brefs délais.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}" class="button">
              Commander ailleurs
            </a>
          </div>
          
          <p>Nous nous excusons pour ce désagrément.</p>
          <p>L'équipe CVN'Eat</p>
        </div>
        <div class="footer">
          <p>CVN'Eat - Livraison de repas à domicile</p>
        </div>
      </body>
      </html>
    `,
    whatsapp: `❌ Commande refusée\n\nVotre commande #${order.id.slice(0, 8)} n'a pas pu être acceptée par ${order.restaurantName || 'le restaurant'}.\n\n${order.rejectionReason ? `Raison: ${order.rejectionReason}\n\n` : ''}Votre paiement sera remboursé automatiquement.\n\nCommandez ailleurs: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}`
  }),

  orderReady: (order) => ({
    subject: `🚀 Votre commande #${order.id.slice(0, 8)} est prête !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 Commande prête !</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Excellente nouvelle ! Votre commande est <strong>prête à être livrée</strong>.</p>
          
          <div class="order-details">
            <h3>📋 Détails de votre commande</h3>
            <p><strong>Numéro de commande :</strong> #${order.id.slice(0, 8)}</p>
            <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
            <p><strong>Montant total :</strong> ${(order.total || 0).toFixed(2)}€</p>
          </div>
          
          <p>Un livreur va bientôt récupérer votre commande et vous la livrer à l'adresse indiquée.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}" class="button">
              Suivre la livraison
            </a>
          </div>
          
          <p>Merci de votre confiance !</p>
          <p>L'équipe CVN'Eat</p>
        </div>
        <div class="footer">
          <p>CVN'Eat - Livraison de repas à domicile</p>
        </div>
      </body>
      </html>
    `,
    whatsapp: `🚀 Commande prête !\n\nVotre commande #${order.id.slice(0, 8)} est prête à être livrée.\n\nRestaurant: ${order.restaurantName || 'Non spécifié'}\nMontant: ${(order.total || 0).toFixed(2)}€\n\nUn livreur va bientôt récupérer votre commande.\n\nSuivez la livraison: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}`
  }),

  orderInDelivery: (order) => ({
    subject: `🚚 Votre commande #${order.id.slice(0, 8)} est en livraison !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .button { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚚 En livraison !</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Votre commande est <strong>en cours de livraison</strong> ! Un livreur est en route vers votre adresse.</p>
          
          <div class="order-details">
            <h3>📋 Détails de votre commande</h3>
            <p><strong>Numéro de commande :</strong> #${order.id.slice(0, 8)}</p>
            <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
            <p><strong>Adresse de livraison :</strong> ${order.deliveryAddress || 'Non spécifiée'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}" class="button">
              Suivre en temps réel
            </a>
          </div>
          
          <p>Merci de votre confiance !</p>
          <p>L'équipe CVN'Eat</p>
        </div>
        <div class="footer">
          <p>CVN'Eat - Livraison de repas à domicile</p>
        </div>
      </body>
      </html>
    `,
    whatsapp: `🚚 En livraison !\n\nVotre commande #${order.id.slice(0, 8)} est en cours de livraison.\n\nUn livreur est en route vers votre adresse.\n\nSuivez en temps réel: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/track-order?id=${order.id}`
  }),

  orderDelivered: (order) => ({
    subject: `🎉 Votre commande #${order.id.slice(0, 8)} a été livrée !`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Commande livrée !</h1>
        </div>
        <div class="content">
          <p>Bonjour,</p>
          <p>Félicitations ! Votre commande a été <strong>livrée avec succès</strong>.</p>
          
          <div class="order-details">
            <h3>📋 Détails de votre commande</h3>
            <p><strong>Numéro de commande :</strong> #${order.id.slice(0, 8)}</p>
            <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
            <p><strong>Montant total :</strong> ${(order.total || 0).toFixed(2)}€</p>
          </div>
          
          <p><strong>Bon appétit !</strong> 🍽️</p>
          
          <p>Nous espérons que vous serez satisfait de votre commande. N'hésitez pas à nous laisser un avis !</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/profile/orders/${order.id}" class="button">
              Voir ma commande
            </a>
          </div>
          
          <p>Merci de votre confiance !</p>
          <p>L'équipe CVN'Eat</p>
        </div>
        <div class="footer">
          <p>CVN'Eat - Livraison de repas à domicile</p>
        </div>
      </body>
      </html>
    `,
    whatsapp: `🎉 Commande livrée !\n\nVotre commande #${order.id.slice(0, 8)} a été livrée avec succès.\n\nBon appétit ! 🍽️\n\nMerci de votre confiance !`
  })
};

export async function POST(request) {
  try {
    const { orderId, status, restaurantName, rejectionReason, preparationTime } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'orderId et status requis' }, { status: 400 });
    }

    // Récupérer les informations de la commande et du client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: order, error: orderError } = await supabaseAdmin
      .from('commandes')
      .select(`
        id,
        total,
        frais_livraison,
        adresse_livraison,
        user_id,
        users:user_id (
          email,
          telephone,
          nom,
          prenom
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Commande non trouvée' }, { status: 404 });
    }

    const customer = order.users;
    if (!customer || !customer.email) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Déterminer le template selon le statut
    let template;
    let orderData = {
      id: order.id,
      total: order.total,
      restaurantName: restaurantName || 'le restaurant',
      deliveryAddress: order.adresse_livraison,
      rejectionReason,
      preparationTime
    };

    switch (status) {
      case 'acceptee':
      case 'en_preparation':
        template = emailTemplates.orderAccepted(orderData);
        break;
      case 'refusee':
      case 'annulee':
        template = emailTemplates.orderRejected(orderData);
        break;
      case 'pret_a_livrer':
        template = emailTemplates.orderReady(orderData);
        break;
      case 'en_livraison':
        template = emailTemplates.orderInDelivery(orderData);
        break;
      case 'livree':
        template = emailTemplates.orderDelivered(orderData);
        break;
      default:
        return NextResponse.json({ error: 'Statut non géré' }, { status: 400 });
    }

    // Envoyer l'email
    await sendEmail(customer.email, template.subject, template.html);

    // Envoyer WhatsApp si disponible
    if (customer.telephone && template.whatsapp) {
      await sendWhatsApp(customer.telephone, template.whatsapp);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Notifications envoyées avec succès',
      emailSent: true,
      whatsappSent: !!customer.telephone
    });

  } catch (error) {
    console.error('Erreur envoi notifications:', error);
    return NextResponse.json({ 
      error: 'Erreur lors de l\'envoi des notifications',
      details: error.message
    }, { status: 500 });
  }
}

