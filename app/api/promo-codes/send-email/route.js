import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import emailService from '../../../../lib/emailService';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { userId, code, description, validUntil } = await request.json();

    if (!userId || !code) {
      return NextResponse.json(
        { error: 'userId et code requis' },
        { status: 400 }
      );
    }

    // Récupérer l'email de l'utilisateur
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('email, prenom, nom')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const userName = user.prenom || user.nom || 'Client';
    const validUntilDate = validUntil 
      ? new Date(validUntil).toLocaleDateString('fr-FR', { 
          day: 'numeric', 
          month: 'long', 
          year: 'numeric' 
        })
      : '1 semaine';

    // Envoyer l'email avec le code promo
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Votre code promo CVN'EAT</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code-box { background: white; border: 3px solid #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .code { font-size: 32px; font-weight: bold; font-family: monospace; color: #10b981; letter-spacing: 4px; }
          .description { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #f59e0b; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Félicitations !</h1>
          <p>Vous avez gagné un code promo sur CVN'EAT</p>
        </div>
        
        <div class="content">
          <p>Bonjour ${userName},</p>
          
          <p>Vous avez récemment tourné la <strong>Roue de la Chance</strong> et avez gagné :</p>
          
          <div class="description">
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #92400e;">
              ${description || 'Code promo'}
            </p>
          </div>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Votre code promo :</p>
            <div class="code">${code}</div>
          </div>
          
          <p style="text-align: center; margin: 20px 0;">
            <strong>Valable jusqu'au ${validUntilDate}</strong><br>
            <span style="color: #6b7280; font-size: 14px;">1 seule utilisation par compte</span>
          </p>
          
          <p style="text-align: center; margin: 30px 0;">
            <a href="https://cvneat.fr" class="button">Utiliser mon code</a>
          </p>
          
          <div style="background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0; color: #4338ca; font-size: 14px;">
              💡 <strong>Comment utiliser :</strong><br>
              Lors de votre prochaine commande, entrez ce code dans le champ "Code promo" au moment du paiement.
            </p>
          </div>
          
          <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
            Vous pouvez également retrouver tous vos codes actifs dans votre compte :<br>
            <a href="https://cvneat.fr/profile" style="color: #6366f1;">Mon compte → Mes gains</a>
          </p>
        </div>
        
        <div class="footer">
          <p>Merci de votre confiance !<br>
          L'équipe CVN'EAT</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `
Félicitations ${userName} !

Vous avez gagné un code promo sur CVN'EAT : ${description || 'Code promo'}

Votre code promo : ${code}

Valable jusqu'au ${validUntilDate} • 1 seule utilisation par compte

Comment utiliser :
Lors de votre prochaine commande, entrez ce code dans le champ "Code promo" au moment du paiement.

Retrouvez tous vos codes actifs dans votre compte : https://cvneat.fr/profile

Merci de votre confiance !
L'équipe CVN'EAT
    `;

    await emailService.sendEmail({
      to: user.email,
      subject: `🎉 Votre code promo CVN'EAT : ${code}`,
      html: emailHtml,
      text: emailText
    });

    return NextResponse.json({
      success: true,
      message: 'Code promo envoyé par email avec succès'
    });

  } catch (error) {
    console.error('Erreur envoi email code promo:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi de l\'email' },
      { status: 500 }
    );
  }
}

