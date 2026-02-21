import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * POST /api/auth/ensure-email-confirmed
 * Débloque les comptes dont l'email n'a pas été confirmé (auto-confirm qui a échoué à l'inscription).
 * Appelé depuis la page login quand la connexion échoue, pour permettre aux clients de se connecter
 * sans avoir à cliquer sur un lien d'email.
 */
export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requis' }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    if (!normalizedEmail.includes('@')) {
      return NextResponse.json({ error: 'Email invalide' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Configuration serveur incomplète' }, { status: 500 });
    }

    // Trouver l'utilisateur par email (listUsers + filtre)
    const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
      page: 1,
    });

    if (listError) {
      console.error('ensure-email-confirmed listUsers error:', listError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    const user = listData?.users?.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!user) {
      // Ne pas révéler si l'utilisateur existe ou non (sécurité)
      return NextResponse.json({ success: true, updated: false });
    }

    // Si l'email est déjà confirmé, rien à faire
    if (user.email_confirmed_at) {
      return NextResponse.json({ success: true, updated: false });
    }

    // Confirmer l'email pour débloquer la connexion
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      { email_confirm: true }
    );

    if (updateError) {
      console.error('ensure-email-confirmed updateUserById error:', updateError);
      return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: true });
  } catch (error) {
    console.error('ensure-email-confirmed:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
