/**
 * Service centralisé d'envoi d'emails de suivi pour les commandes
 * Envoie automatiquement des emails aux clients à chaque étape importante
 */

import { Resend } from 'resend';

// Initialiser Resend
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY non configurée - emails non envoyés');
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

// Fonction utilitaire pour envoyer un email
async function sendOrderEmail(to, subject, html) {
  try {
    const resend = getResend();
    if (!resend) {
      return { success: false, error: 'Email service not configured' };
    }

    const { data, error } = await resend.emails.send({
      from: 'CVN\'EAT <noreply@cvneat.fr>',
      to: to,
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Erreur envoi email:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ Email envoyé avec succès à:', to);
    return { success: true, messageId: data?.id };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    return { success: false, error: error.message };
  }
}

// Template de base pour tous les emails
const baseEmailTemplate = (content) => `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #ea580c, #f97316); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; }
      .order-details { background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ea580c; }
      .code-box { background: #FEF3C7; border: 2px dashed #F59E0B; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
      .code { font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 5px; font-family: monospace; }
      .button { display: inline-block; padding: 12px 24px; background: #ea580c; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
      .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; background: #f9fafb; border-radius: 0 0 10px 10px; }
      .status-badge { display: inline-block; padding: 8px 16px; background: #10b981; color: white; border-radius: 20px; font-weight: bold; margin: 10px 0; }
    </style>
  </head>
  <body>
    <div class="header">
      ${content.header}
    </div>
    <div class="content">
      ${content.body}
    </div>
    <div class="footer">
      <p>CVN'EAT - Livraison de repas dans les Cévennes</p>
      <p>© 2025 CVN'EAT. Tous droits réservés.</p>
    </div>
  </body>
  </html>
`;

// Templates d'emails pour chaque étape
export const orderEmailTemplates = {
  // 1. Commande acceptée par le restaurant
  orderAccepted: (order) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr';
    return baseEmailTemplate({
      header: `
        <h1 style="margin: 0;">✅ Commande acceptée !</h1>
        <p style="margin: 10px 0 0 0;">Votre commande est en cours de préparation</p>
      `,
      body: `
        <p>Bonjour ${order.customerName || 'cher client'},</p>
        
        <p>Excellente nouvelle ! Votre commande a été <strong>acceptée</strong> par le restaurant <strong>${order.restaurantName || 'le restaurant'}</strong>.</p>
        
        <div class="order-details">
          <h3>📋 Détails de votre commande</h3>
          <p><strong>Numéro de commande :</strong> #${order.id?.slice(0, 8) || 'N/A'}</p>
          <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
          <p><strong>Montant total :</strong> ${((order.total || 0) + (order.frais_livraison || 0)).toFixed(2)}€</p>
          ${order.adresse_livraison ? `<p><strong>Adresse de livraison :</strong> ${order.adresse_livraison}</p>` : ''}
          ${order.preparationTime ? `<p><strong>Temps de préparation estimé :</strong> ${order.preparationTime} minutes</p>` : ''}
        </div>
        
        ${order.security_code ? `
        <div class="code-box">
          <p style="margin: 0 0 10px 0; color: #92400E; font-weight: bold;">🔐 Code de sécurité</p>
          <div class="code">${order.security_code}</div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400E;">Communiquez ce code au livreur à la réception</p>
        </div>
        ` : ''}
        
        <p>Votre commande est maintenant <strong>en préparation</strong>. Vous recevrez une notification dès qu'elle sera prête !</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/track-order?id=${order.id}" class="button">
            🔍 Suivre ma commande
          </a>
        </div>
        
        <p>Merci de votre confiance !</p>
        <p>L'équipe CVN'EAT</p>
      `
    });
  },

  // 2. Commande prête à être livrée
  orderReady: (order) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr';
    return baseEmailTemplate({
      header: `
        <h1 style="margin: 0;">🎉 Votre commande est prête !</h1>
        <p style="margin: 10px 0 0 0;">Un livreur va bientôt la récupérer</p>
      `,
      body: `
        <p>Bonjour ${order.customerName || 'cher client'},</p>
        
        <p>Votre commande est <strong>prête</strong> ! Le restaurant a terminé la préparation.</p>
        
        <div class="status-badge">👨‍🍳 Prête à être livrée</div>
        
        <div class="order-details">
          <h3>📋 Détails de votre commande</h3>
          <p><strong>Numéro de commande :</strong> #${order.id?.slice(0, 8) || 'N/A'}</p>
          <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
          <p><strong>Montant total :</strong> ${((order.total || 0) + (order.frais_livraison || 0)).toFixed(2)}€</p>
        </div>
        
        ${order.security_code ? `
        <div class="code-box">
          <p style="margin: 0 0 10px 0; color: #92400E; font-weight: bold;">🔐 Code de sécurité</p>
          <div class="code">${order.security_code}</div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400E;">Communiquez ce code au livreur à la réception</p>
        </div>
        ` : ''}
        
        <p>Un livreur va bientôt récupérer votre commande. Vous recevrez une notification dès qu'il sera en route vers vous !</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/track-order?id=${order.id}" class="button">
            📍 Suivre en temps réel
          </a>
        </div>
        
        <p>À très bientôt !</p>
        <p>L'équipe CVN'EAT</p>
      `
    });
  },

  // 3. Livreur en route
  driverOnTheWay: (order) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr';
    return baseEmailTemplate({
      header: `
        <h1 style="margin: 0;">🚚 Votre commande est en route !</h1>
        <p style="margin: 10px 0 0 0;">Le livreur est parti avec votre commande</p>
      `,
      body: `
        <p>Bonjour ${order.customerName || 'cher client'},</p>
        
        <p>Excellente nouvelle ! Un livreur est <strong>en route</strong> vers vous avec votre commande.</p>
        
        <div class="status-badge">🚴 En livraison</div>
        
        <div class="order-details">
          <h3>📋 Détails de votre commande</h3>
          <p><strong>Numéro de commande :</strong> #${order.id?.slice(0, 8) || 'N/A'}</p>
          <p><strong>Restaurant :</strong> ${order.restaurantName || 'Non spécifié'}</p>
          <p><strong>Adresse de livraison :</strong> ${order.adresse_livraison || 'Non spécifiée'}</p>
        </div>
        
        ${order.security_code ? `
        <div class="code-box">
          <p style="margin: 0 0 10px 0; color: #92400E; font-weight: bold;">🔐 Code de sécurité</p>
          <div class="code">${order.security_code}</div>
          <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400E;">Communiquez ce code au livreur à la réception</p>
        </div>
        ` : ''}
        
        <p><strong>⏱️ Temps estimé d'arrivée :</strong> ${order.estimatedDeliveryTime || '10-15'} minutes</p>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0;"><strong>💡 Astuce :</strong> Restez disponible, le livreur arrivera bientôt !</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl}/track-order?id=${order.id}" class="button">
            📍 Suivre en temps réel
          </a>
        </div>
        
        <p>À très bientôt !</p>
        <p>L'équipe CVN'EAT</p>
      `
    });
  }
};

/**
 * Envoyer un email de notification pour un changement de statut de commande
 */
export async function sendOrderStatusEmail(order, status, customerEmail) {
  if (!customerEmail) {
    console.warn('⚠️ Pas d\'email client, notification non envoyée');
    return { success: false, error: 'No customer email' };
  }

  let template = null;
  let subject = '';

  // Sélectionner le template selon le statut
  switch (status) {
    case 'acceptee':
    case 'en_preparation':
      // Email quand la commande est acceptée ou en préparation
      template = orderEmailTemplates.orderAccepted(order);
      subject = `✅ Votre commande #${order.id?.slice(0, 8)} a été acceptée !`;
      break;
      
    case 'pret_a_livrer':
      // Email quand la commande est prête
      template = orderEmailTemplates.orderReady(order);
      subject = `🎉 Votre commande #${order.id?.slice(0, 8)} est prête !`;
      break;
      
    case 'en_livraison':
      // Email quand le livreur est en route
      template = orderEmailTemplates.driverOnTheWay(order);
      subject = `🚚 Votre commande #${order.id?.slice(0, 8)} est en route !`;
      break;
      
    default:
      console.log(`ℹ️ Pas d'email pour le statut: ${status}`);
      return { success: false, error: 'No email template for this status' };
  }

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  // Envoyer l'email
  return await sendOrderEmail(customerEmail, subject, template);
}

