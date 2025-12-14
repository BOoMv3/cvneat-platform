import nodemailer from 'nodemailer';

// Fonction pour créer le transporter (lazy loading pour éviter les erreurs si les variables ne sont pas encore définies)
let transporter = null;

const getTransporter = () => {
  if (transporter) {
    return transporter;
  }

  const host = process.env.EMAIL_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.EMAIL_PORT || '587');
  const secure = process.env.EMAIL_SECURE === 'true';
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    console.warn('⚠️ Configuration email incomplète: EMAIL_USER ou EMAIL_PASS manquant');
    return null;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure, // true for 465, false for other ports
    auth: {
      user, // Email Brevo ou 'apikey' pour SendGrid
      pass  // Clé SMTP Brevo ou API Key SendGrid
    },
    // Options supplémentaires pour Brevo
    tls: {
      rejectUnauthorized: false // Pour éviter les problèmes de certificat
    }
  });

  return transporter;
};

const emailTemplates = {
  deliveryCompleted: ({ customerName, orderNumber, restaurantName, totalAmount, orderUrl, feedbackUrl }) => ({
    subject: `🎉 Votre commande #${orderNumber} a été livrée !`,
    html: `
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
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
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
            <p><strong>Montant total :</strong> ${totalAmount}€</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${orderUrl}" class="button">Voir ma commande</a>
            <a href="${feedbackUrl}" class="button">Donner mon avis</a>
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
    `,
    text: `
      Commande livrée avec succès - CVNeat
      
      Bonjour ${customerName},
      
      Nous avons le plaisir de vous confirmer que votre commande #${orderNumber} de ${restaurantName} a été livrée avec succès !
      
      Détails de votre commande :
      - Numéro de commande : #${orderNumber}
      - Restaurant : ${restaurantName}
      - Montant total : ${totalAmount}€
      
      Voir ma commande : ${orderUrl}
      Donner mon avis : ${feedbackUrl}
      
      Si vous avez des questions ou rencontrez un problème, n'hésitez pas à contacter notre support à support@cvneat.com.
      
      Nous espérons que vous avez apprécié votre commande !
      
      Cordialement,
      L'équipe CVNeat
    `
  }),
  complaintResolved: ({ customerName, complaintTitle, orderNumber, status, refundAmount }) => ({
    subject: `Réclamation résolue - Commande #${orderNumber}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réclamation résolue - CVNeat</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${status === 'approved' ? '#10b981' : '#ef4444'}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${status === 'approved' ? '✅ Remboursement approuvé' : '❌ Remboursement refusé'}</h1>
        </div>
        
        <div class="content">
          <p>Bonjour ${customerName},</p>
          
          <p>Nous avons traité votre réclamation concernant : <strong>${complaintTitle}</strong></p>
          
          <p><strong>Statut :</strong> ${status === 'approved' ? 'Approuvé' : 'Refusé'}</p>
          
          ${status === 'approved' && refundAmount ? `
            <p><strong>Montant remboursé :</strong> ${refundAmount}€</p>
            <p>Le remboursement sera visible sur votre compte dans 2-5 jours ouvrables.</p>
          ` : ''}
          
          <p>Merci de votre compréhension.</p>
          
          <p>Cordialement,<br>
          L'équipe CVNeat</p>
        </div>
        
        <div class="footer">
          <p>CVNeat - Plateforme de livraison de repas</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Réclamation résolue - CVNeat
      
      Bonjour ${customerName},
      
      Nous avons traité votre réclamation concernant : ${complaintTitle}
      
      Statut : ${status === 'approved' ? 'Approuvé' : 'Refusé'}
      
      ${status === 'approved' && refundAmount ? `Montant remboursé : ${refundAmount}€` : ''}
      
      Merci de votre compréhension.
      
      Cordialement,
      L'équipe CVNeat
    `
  })
};

const emailService = {
  sendEmail: async ({ to, subject, html, text }) => {
    // Vérifier la configuration
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      const error = new Error('Configuration email manquante: EMAIL_USER ou EMAIL_PASS non définis');
      console.error('❌', error.message);
      console.error('Configuration actuelle:', {
        EMAIL_HOST: process.env.EMAIL_HOST || 'smtp-relay.brevo.com (défaut)',
        EMAIL_PORT: process.env.EMAIL_PORT || '587',
        EMAIL_USER: process.env.EMAIL_USER ? '✓' : '✗',
        EMAIL_PASS: process.env.EMAIL_PASS ? '✓' : '✗',
        EMAIL_FROM: process.env.EMAIL_FROM || 'contact@cvneat.fr'
      });
      throw error;
    }

    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      throw new Error('Impossible de créer le transporteur email: configuration manquante');
    }

    // Formater le "from" avec le nom de l'entreprise
    const fromAddress = process.env.EMAIL_FROM || 'contact@cvneat.fr';
    const fromName = 'CVN\'EAT';
    const formattedFrom = fromAddress.includes('<') 
      ? fromAddress 
      : `${fromName} <${fromAddress}>`;

    const mailOptions = {
      from: formattedFrom, // Format: "CVN'EAT <contact@cvneat.fr>"
      to,
      subject: subject.trim(), // Nettoyer le sujet
      html,
      text: text || html.replace(/<[^>]*>/g, '').trim(),
      // En-têtes pour améliorer la délivrabilité
      headers: {
        'X-Mailer': 'CVN\'EAT Platform',
        'List-Unsubscribe': `<${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat.fr'}/unsubscribe>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    };

    try {
      console.log(`📧 Tentative d'envoi email à ${to}...`);
      const info = await emailTransporter.sendMail(mailOptions);
      console.log(`✅ Email envoyé à ${to} avec succès. MessageId: ${info.messageId}`);
      return info;
    } catch (error) {
      console.error(`❌ Erreur lors de l'envoi de l'email à ${to}:`, error.message);
      console.error('Détails erreur:', {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
      throw error;
    }
  },
  getTemplates: () => emailTemplates,
};

export default emailService;
