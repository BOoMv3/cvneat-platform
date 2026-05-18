import { NextResponse } from 'next/server';
import emailService from '@/lib/emailService';
import { generateAuthActionLink, getAuthRedirectBase } from '@/lib/auth-email';

export async function POST(request) {
  try {
    const { email, sendEmail = true } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    const redirectTo = `${getAuthRedirectBase()}/auth/confirm`;
    const confirmationUrl = await generateAuthActionLink('signup', normalized, redirectTo);

    if (sendEmail) {
      const template = emailService.getTemplates().accountConfirmation({
        confirmationUrl,
      });
      await emailService.sendEmail({
        to: normalized,
        subject: template.subject,
        html: template.html,
        text: template.text,
      });
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
