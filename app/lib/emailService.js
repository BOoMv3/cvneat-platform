// Service d'email avec support SendGrid, Mailgun et SMTP
import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';

class EmailService {
  constructor() {
    this.provider = process.env.EMAIL_PROVIDER || 'sendgrid';
    this.fromEmail = process.env.EMAIL_FROM || 'contact@cvneat.fr';
    
    // Configuration SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
    
    // Configuration SMTP
    if (this.provider === 'smtp') {
      this.transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }
  }

  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      console.log(`📧 Envoi email via ${this.provider} à ${to}`);
      
      switch (this.provider) {
        case 'sendgrid':
          return await this.sendWithSendGrid({ to, subject, html, text, attachments });
        case 'mailgun':
          return await this.sendWithMailgun({ to, subject, html, text, attachments });
        case 'smtp':
          return await this.sendWithSMTP({ to, subject, html, text, attachments });
        default:
          throw new Error(`Provider email non supporté: ${this.provider}`);
      }
    } catch (error) {
      console.error('❌ Erreur envoi email:', error);
      throw error;
    }
  }

  async sendWithSendGrid({ to, subject, html, text, attachments }) {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY non configurée');
    }

    const msg = {
      to,
      from: this.fromEmail,
      subject,
      text,
      html,
      attachments: attachments.map(att => ({
        content: att.content,
        filename: att.filename,
        type: att.type,
        disposition: 'attachment'
      }))
    };

    const response = await sgMail.send(msg);
    console.log('✅ Email SendGrid envoyé:', response[0].statusCode);
    return response;
  }

  async sendWithMailgun({ to, subject, html, text, attachments }) {
    const formData = new FormData();
    formData.append('from', this.fromEmail);
    formData.append('to', to);
    formData.append('subject', subject);
    formData.append('html', html);
    formData.append('text', text);

    attachments.forEach((att, index) => {
      formData.append(`attachment[${index}]`, att.content);
    });

    const response = await fetch(
      `https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString('base64')}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error(`Mailgun error: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Email Mailgun envoyé:', result.id);
    return result;
  }

  async sendWithSMTP({ to, subject, html, text, attachments }) {
    const mailOptions = {
      from: this.fromEmail,
      to,
      subject,
      html,
      text,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.type
      }))
    };

    const result = await this.transporter.sendMail(mailOptions);
    console.log('✅ Email SMTP envoyé:', result.messageId);
    return result;
  }

  // Templates d'emails
  getTemplates() {
    return {
      deliveryCompleted: (data) => ({
        subject: `Commande livrée avec succès - CVNeat`,
        html: this.generateDeliveryCompletedHTML(data),
        text: this.generateDeliveryCompletedText(data)
      }),

      complaintCreated: (data) => ({
        subject: `Réclamation reçue - CVNeat`,
        html: this.generateComplaintCreatedHTML(data),
        text: this.generateComplaintCreatedText(data)
      }),

      complaintResolved: (data) => ({
        subject: `Réclamation résolue - CVNeat`,
        html: this.generateComplaintResolvedHTML(data),
        text: this.generateComplaintResolvedText(data)
      })
    };
  }

  generateDeliveryCompletedHTML({ customerName, orderNumber, restaurantName, totalAmount, orderUrl, feedbackUrl }) {
    return `
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
          
          <p>Nous espérons que vous avez apprécié votre commande !</p>
          
          <p>Cordialement,<br>L'équipe CVNeat</p>
        </div>
        
        <div class="footer">
          <p>CVNeat - Plateforme de livraison de repas</p>
        </div>
      </body>
      </html>
    `;
  }

  generateDeliveryCompletedText({ customerName, orderNumber, restaurantName, totalAmount, orderUrl, feedbackUrl }) {
    return `
      Commande livrée avec succès - CVNeat
      
      Bonjour ${customerName},
      
      Nous avons le plaisir de vous confirmer que votre commande a été livrée avec succès !
      
      Détails de votre commande :
      - Numéro de commande : #${orderNumber}
      - Restaurant : ${restaurantName}
      - Montant total : ${totalAmount}€
      
      Voir ma commande : ${orderUrl}
      Donner mon avis : ${feedbackUrl}
      
      Nous espérons que vous avez apprécié votre commande !
      
      Cordialement,
      L'équipe CVNeat
    `;
  }

  generateComplaintCreatedHTML({ customerName, complaintTitle, orderNumber, complaintUrl }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réclamation reçue - CVNeat</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .complaint-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
          .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📝 Réclamation reçue</h1>
          <p>Nous avons bien reçu votre réclamation</p>
        </div>
        
        <div class="content">
          <p>Bonjour ${customerName},</p>
          
          <p>Nous avons bien reçu votre réclamation concernant votre commande #${orderNumber}.</p>
          
          <div class="complaint-details">
            <h3>📋 Détails de votre réclamation</h3>
            <p><strong>Sujet :</strong> ${complaintTitle}</p>
            <p><strong>Numéro de commande :</strong> #${orderNumber}</p>
            <p><strong>Statut :</strong> En cours d'examen</p>
          </div>
          
          <p>Notre équipe examine votre réclamation et vous tiendra informé de l'avancement dans les plus brefs délais.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${complaintUrl}" class="button">Suivre ma réclamation</a>
          </div>
          
          <p>Merci de votre patience.</p>
          
          <p>Cordialement,<br>L'équipe CVNeat</p>
        </div>
        
        <div class="footer">
          <p>CVNeat - Plateforme de livraison de repas</p>
        </div>
      </body>
      </html>
    `;
  }

  generateComplaintCreatedText({ customerName, complaintTitle, orderNumber, complaintUrl }) {
    return `
      Réclamation reçue - CVNeat
      
      Bonjour ${customerName},
      
      Nous avons bien reçu votre réclamation concernant votre commande #${orderNumber}.
      
      Détails de votre réclamation :
      - Sujet : ${complaintTitle}
      - Numéro de commande : #${orderNumber}
      - Statut : En cours d'examen
      
      Notre équipe examine votre réclamation et vous tiendra informé de l'avancement dans les plus brefs délais.
      
      Suivre ma réclamation : ${complaintUrl}
      
      Merci de votre patience.
      
      Cordialement,
      L'équipe CVNeat
    `;
  }

  generateComplaintResolvedHTML({ customerName, complaintTitle, orderNumber, status, refundAmount, complaintUrl }) {
    const isApproved = status === 'approved';
    const headerColor = isApproved ? '#10b981' : '#dc2626';
    const statusText = isApproved ? 'Approuvée' : 'Rejetée';
    const statusIcon = isApproved ? '✅' : '❌';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réclamation résolue - CVNeat</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${headerColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .resolution-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid ${headerColor}; }
          .button { display: inline-block; padding: 12px 24px; background: ${headerColor}; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${statusIcon} Réclamation ${statusText}</h1>
          <p>Votre réclamation a été traitée</p>
        </div>
        
        <div class="content">
          <p>Bonjour ${customerName},</p>
          
          <p>Votre réclamation concernant la commande #${orderNumber} a été ${statusText.toLowerCase()}.</p>
          
          <div class="resolution-details">
            <h3>📋 Détails de la résolution</h3>
            <p><strong>Sujet :</strong> ${complaintTitle}</p>
            <p><strong>Numéro de commande :</strong> #${orderNumber}</p>
            <p><strong>Statut :</strong> ${statusText}</p>
            ${isApproved && refundAmount ? `<p><strong>Montant remboursé :</strong> ${refundAmount}€</p>` : ''}
          </div>
          
          ${isApproved ? 
            '<p>Le remboursement sera traité dans les 2-5 jours ouvrables sur votre moyen de paiement original.</p>' :
            '<p>Si vous n\'êtes pas d\'accord avec cette décision, vous pouvez nous contacter pour plus d\'informations.</p>'
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${complaintUrl}" class="button">Voir les détails</a>
          </div>
          
          <p>Merci de votre confiance.</p>
          
          <p>Cordialement,<br>L'équipe CVNeat</p>
        </div>
        
        <div class="footer">
          <p>CVNeat - Plateforme de livraison de repas</p>
        </div>
      </body>
      </html>
    `;
  }

  generateComplaintResolvedText({ customerName, complaintTitle, orderNumber, status, refundAmount, complaintUrl }) {
    const isApproved = status === 'approved';
    const statusText = isApproved ? 'Approuvée' : 'Rejetée';
    
    return `
      Réclamation ${statusText} - CVNeat
      
      Bonjour ${customerName},
      
      Votre réclamation concernant la commande #${orderNumber} a été ${statusText.toLowerCase()}.
      
      Détails de la résolution :
      - Sujet : ${complaintTitle}
      - Numéro de commande : #${orderNumber}
      - Statut : ${statusText}
      ${isApproved && refundAmount ? `- Montant remboursé : ${refundAmount}€` : ''}
      
      ${isApproved ? 
        'Le remboursement sera traité dans les 2-5 jours ouvrables sur votre moyen de paiement original.' :
        'Si vous n\'êtes pas d\'accord avec cette décision, vous pouvez nous contacter pour plus d\'informations.'
      }
      
      Voir les détails : ${complaintUrl}
      
      Merci de votre confiance.
      
      Cordialement,
      L'équipe CVNeat
    `;
  }
}

// Instance singleton
const emailService = new EmailService();

export default emailService;
