import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase';

function getRedirectBase() {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr';
  return raw.endsWith('/') ? raw.slice(0, -1) : raw;
}

async function generateConfirmationLink(email) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin non configuré (clé service manquante)');
  }

  const redirectTo = `${getRedirectBase()}/auth/confirm`;

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: {
      redirectTo,
    },
  });

  if (error) {
    throw new Error(`Erreur génération lien Supabase: ${error.message}`);
  }

  const confirmationUrl =
    data?.properties?.action_link ||
    data?.action_link ||
    data?.redirect_to ||
    null;

  if (!confirmationUrl) {
    throw new Error('Impossible de récupérer le lien de confirmation');
  }

  return confirmationUrl;
}

async function sendConfirmationEmail(email, confirmationUrl) {
  try {
    await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'accountConfirmation',
        data: { confirmationUrl },
        recipientEmail: email,
      }),
    });
  } catch (emailError) {
    console.warn('Erreur envoi email personnalisé:', emailError);
    // Ne pas faire échouer la requête si l'email personnalisé échoue
  }
}

// Cette route est appelée après l'inscription pour envoyer un email de confirmation personnalisé
export async function POST(request) {
  try {
    const { email, sendEmail = true } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const confirmationUrl = await generateConfirmationLink(email.toLowerCase().trim());

    if (sendEmail) {
      await sendConfirmationEmail(email, confirmationUrl);
    }

    return NextResponse.json({
      success: true,
      confirmationUrl,
    });
  } catch (error) {
    console.error('Erreur envoi email confirmation:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

