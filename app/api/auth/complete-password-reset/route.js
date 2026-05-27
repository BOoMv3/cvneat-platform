import { NextResponse } from 'next/server';
import { completePasswordResetWithTokenHash } from '@/lib/auth-recovery';
const { validatePassword } = require('@/lib/validation');

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const tokenHash = String(body?.token_hash || body?.tokenHash || '').trim();
    const type = String(body?.type || 'recovery').trim() || 'recovery';
    const password = String(body?.password || '');

    if (!tokenHash) {
      return NextResponse.json(
        { error: 'Lien invalide. Redemandez un email depuis « Mot de passe oublié ».' },
        { status: 400 }
      );
    }

    if (type !== 'recovery') {
      return NextResponse.json(
        { error: 'Ce lien n’est pas prévu pour une réinitialisation de mot de passe.' },
        { status: 400 }
      );
    }

    const pwdCheck = validatePassword(password);
    if (!pwdCheck.isValid) {
      return NextResponse.json(
        {
          error: pwdCheck.errors[0] || 'Mot de passe invalide.',
          errors: pwdCheck.errors,
        },
        { status: 400 }
      );
    }

    await completePasswordResetWithTokenHash({
      tokenHash,
      password,
      type,
    });

    return NextResponse.json({
      success: true,
      message: 'Mot de passe mis à jour. Vous pouvez vous connecter.',
    });
  } catch (err) {
    console.error('❌ complete-password-reset:', err?.message || err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          'Impossible de réinitialiser le mot de passe. Redemandez un nouvel email.',
      },
      { status: 400 }
    );
  }
}
