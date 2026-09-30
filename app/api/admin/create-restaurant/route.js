import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminWriterRole } from '@/lib/admin-viewer';
import { activatePartnerFromRequest } from '@/lib/activate-partner-from-request';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token manquant' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData || !isAdminWriterRole(userData.role)) {
      return NextResponse.json({ error: 'Accès non autorisé - Admin requis' }, { status: 403 });
    }

    const requestData = await request.json();
    const { email, nom, description, adresse, ville, code_postal, telephone, request_id } =
      requestData || {};

    if (!email || !nom) {
      return NextResponse.json({ error: 'Email et nom du restaurant requis' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const activation = await activatePartnerFromRequest(
      supabaseAdmin,
      {
        id: request_id || null,
        email,
        nom,
        description,
        adresse,
        ville,
        code_postal,
        telephone,
      },
      { sendEmail: true, resetPassword: true }
    );

    return NextResponse.json({
      success: true,
      restaurant: activation.restaurant,
      userId: activation.userId,
      createdAuth: activation.createdAuth,
      createdRestaurant: activation.createdRestaurant,
      emailSent: Boolean(activation.emailMessageId) && !activation.emailError,
      emailError: activation.emailError || null,
      // Mot de passe temporaire uniquement pour l'admin (affichage succès) — aussi envoyé par email
      tempPassword: activation.tempPassword || null,
    });
  } catch (error) {
    console.error('❌ Erreur API création restaurant:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Erreur serveur',
      },
      { status: 500 }
    );
  }
}
