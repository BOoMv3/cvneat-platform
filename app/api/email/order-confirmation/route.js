import { NextResponse } from 'next/server';
import { Resend } from 'resend';

// Initialiser Resend uniquement si la clé est disponible
const getResend = () => {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  return new Resend(process.env.RESEND_API_KEY);
};

export async function POST(request) {
  try {
    const { order, customerEmail } = await request.json();

    if (!order || !customerEmail) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Formater les articles
    const itemsHtml = order.items?.map(item => {
      let itemHtml = `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${item.name}</strong>
            ${item.isCombo ? ' 🍔 Menu' : ''}
            <br><span style="color: #666;">x${item.quantity}</span>
      `;
      
      // Ajouter les détails du combo
      if (item.isCombo && item.comboDetails && item.comboDetails.length > 0) {
        itemHtml += '<div style="margin-top: 5px; font-size: 12px; color: #666;">';
        item.comboDetails.forEach(detail => {
          itemHtml += `<div>• ${detail.stepTitle}: <strong>${detail.optionName}</strong></div>`;
        });
        itemHtml += '</div>';
      }
      
      itemHtml += `
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">
            ${(item.price * item.quantity).toFixed(2)}€
          </td>
        </tr>
      `;
      return itemHtml;
    }).join('') || '';

    const subtotal = order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;
    const deliveryFee = order.deliveryFee || 0;
    const platformFee = order.platformFee || 0.49;
    const total = subtotal + deliveryFee + platformFee;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3B82F6, #1D4ED8); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; }
          .code-box { background: #FEF3C7; border: 2px dashed #F59E0B; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px; }
          .code { font-size: 32px; font-weight: bold; color: #D97706; letter-spacing: 5px; }
          table { width: 100%; border-collapse: collapse; }
          .total-row { font-weight: bold; font-size: 18px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0;">🎉 Commande confirmée !</h1>
            <p style="margin: 10px 0 0 0;">Merci pour votre commande sur CVN'EAT</p>
          </div>
          
          <div class="content">
            <p>Bonjour ${order.customerName || 'cher client'},</p>
            <p>Votre commande a bien été enregistrée et est en cours de préparation.</p>
            
            <div class="code-box">
              <p style="margin: 0 0 10px 0; color: #92400E;">Votre code de suivi :</p>
              <div class="code">${order.securityCode || '------'}</div>
              <p style="margin: 10px 0 0 0; font-size: 12px; color: #92400E;">
                Communiquez ce code au livreur à la réception
              </p>
            </div>
            
            <h3>📍 Livraison</h3>
            <p style="background: #F3F4F6; padding: 15px; border-radius: 8px;">
              <strong>${order.restaurantName || 'Restaurant'}</strong><br>
              ${order.deliveryAddress || 'Adresse non spécifiée'}
            </p>
            
            <h3>🛒 Récapitulatif de votre commande</h3>
            <table>
              <thead>
                <tr style="background: #F3F4F6;">
                  <th style="padding: 10px; text-align: left;">Article</th>
                  <th style="padding: 10px; text-align: right;">Prix</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td style="padding: 10px;">Sous-total</td>
                  <td style="padding: 10px; text-align: right;">${subtotal.toFixed(2)}€</td>
                </tr>
                <tr>
                  <td style="padding: 10px;">Frais de livraison</td>
                  <td style="padding: 10px; text-align: right;">${deliveryFee.toFixed(2)}€</td>
                </tr>
                <tr>
                  <td style="padding: 10px;">Frais de service</td>
                  <td style="padding: 10px; text-align: right;">${platformFee.toFixed(2)}€</td>
                </tr>
                <tr class="total-row" style="background: #3B82F6; color: white;">
                  <td style="padding: 15px;">TOTAL</td>
                  <td style="padding: 15px; text-align: right;">${total.toFixed(2)}€</td>
                </tr>
              </tfoot>
            </table>
            
            <p style="margin-top: 30px;">
              Suivez votre commande en temps réel sur <a href="https://www.cvneat.fr/track-order?code=${order.securityCode}" style="color: #3B82F6;">notre site</a>.
            </p>
            
            <p>À très bientôt sur CVN'EAT ! 🚀</p>
          </div>
          
          <div class="footer">
            <p>CVN'EAT - Livraison de repas dans les Cévennes</p>
            <p>© 2025 CVN'EAT. Tous droits réservés.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const resend = getResend();
    if (!resend) {
      console.warn('⚠️ RESEND_API_KEY non configurée, email non envoyé');
      return NextResponse.json({ success: false, message: 'Email service not configured' });
    }

    const { data, error } = await resend.emails.send({
      from: 'CVN\'EAT <noreply@cvneat.fr>',
      to: customerEmail,
      subject: `🍔 Commande confirmée - Code: ${order.securityCode}`,
      html: emailHtml,
    });

    if (error) {
      console.error('Erreur envoi email:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email de confirmation envoyé à:', customerEmail);
    return NextResponse.json({ success: true, messageId: data?.id });

  } catch (error) {
    console.error('Erreur email confirmation commande:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

