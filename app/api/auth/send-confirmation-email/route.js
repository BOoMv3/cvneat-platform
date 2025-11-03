import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

// Cette route est appelée après l'inscription pour envoyer un email de confirmation personnalisé en français
export async function POST(request) {
  try {
    const { email, userId } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    // Envoyer un email de confirmation personnalisé en français
    // Note: Supabase envoie automatiquement un email de confirmation, mais nous pouvons aussi envoyer un email personnalisé
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'accountConfirmation',
          data: {
            email,
            confirmationUrl: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://cvneat-platform.vercel.app'}/auth/confirm?token=${userId}`
          },
          recipientEmail: email
        })
      });
    } catch (emailError) {
      console.warn('Erreur envoi email personnalisé:', emailError);
      // Ne pas faire échouer la requête si l'email personnalisé échoue
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Email de confirmation envoyé' 
    });

  } catch (error) {
    console.error('Erreur envoi email confirmation:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

