import { NextResponse } from 'next/server';
import emailService from '@/lib/emailService';
import { generatePasswordRecoveryUrl } from '@/lib/auth-email';
import { findAuthUserByEmail } from '@/lib/auth-recovery';
import { supabaseAdmin } from '@/lib/supabase';
const { isValidEmail } = require('@/lib/validation');

export const dynamic = 'force-dynamic';

const GENERIC_OK = {
  success: true,
  message:
    'Si un compte existe avec cette adresse, vous recevrez un email avec un lien pour choisir un nouveau mot de passe. Pensez à vérifier vos spams.',
};

export async function POST(request) {
  try {
    const body = await request.json();
    const email = String(body?.email || '')
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Adresse email invalide.' },
        { status: 400 }
      );
    }

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('❌ forgot-password: EMAIL_USER / EMAIL_PASS manquants');
      return NextResponse.json(
        {
          error:
            'Envoi d\'email temporairement indisponible. Contactez contact@cvneat.fr pour réinitialiser votre mot de passe.',
        },
        { status: 503 }
      );
    }

    if (supabaseAdmin) {
      try {
        const authUser = await findAuthUserByEmail(email);
        if (!authUser) {
          const { data: profileRow } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', email)
            .maybeSingle();
          if (profileRow?.id) {
            console.warn(
              `⚠️ forgot-password: profil users sans compte Auth pour ${email} — email non envoyé`
            );
          } else {
            console.log(`ℹ️ forgot-password: aucun compte pour ${email}`);
          }
          return NextResponse.json(GENERIC_OK);
        }
      } catch (lookupErr) {
        console.warn('⚠️ forgot-password lookup:', lookupErr?.message || lookupErr);
      }
    }

    let resetUrl;
    try {
      resetUrl = await generatePasswordRecoveryUrl(email);
    } catch (linkErr) {
      const msg = (linkErr.message || '').toLowerCase();
      if (
        msg.includes('not found') ||
        msg.includes('user not found') ||
        msg.includes('no user') ||
        msg.includes('invalid')
      ) {
        console.log(`ℹ️ forgot-password: pas de compte auth pour ${email}`);
        return NextResponse.json(GENERIC_OK);
      }
      console.error('❌ generateLink recovery:', linkErr.message);
      return NextResponse.json(
        {
          error:
            'Impossible d\'envoyer l\'email pour le moment. Réessayez dans quelques minutes ou écrivez à contact@cvneat.fr.',
        },
        { status: 500 }
      );
    }

    const template = emailService.getTemplates().passwordReset({
      resetUrl,
      email,
    });

    await emailService.sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`✅ Email réinitialisation envoyé à ${email}`);
    return NextResponse.json(GENERIC_OK);
  } catch (err) {
    console.error('❌ forgot-password:', err);
    return NextResponse.json(
      {
        error:
          'Une erreur est survenue. Réessayez plus tard ou contactez contact@cvneat.fr.',
      },
      { status: 500 }
    );
  }
}
