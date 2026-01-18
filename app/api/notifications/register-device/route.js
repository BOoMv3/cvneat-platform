import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * API pour enregistrer un token de notification push (FCM)
 * Utilisé par l'app mobile Capacitor
 */
export async function POST(request) {
  try {
    const { token, platform } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      );
    }

    // Récupérer l'utilisateur connecté
    // IMPORTANT: dans l'app Capacitor on utilise surtout Authorization: Bearer <access_token>
    // (les cookies ne sont pas fiables à cause du CORS/cross-origin).
    const authHeader = request.headers.get('authorization');
    const bearer =
      authHeader && authHeader.toLowerCase().startsWith('bearer ')
        ? authHeader.slice(7).trim()
        : null;

    const cookieStore = cookies();
    const cookieToken = cookieStore.get('sb-access-token')?.value;

    const authToken = bearer || cookieToken || null;

    let userId = null;

    if (!authToken) {
      // Ne pas enregistrer de tokens "orphelins" (sinon /send-push par rôle ne trouvera rien)
      return NextResponse.json({ error: 'Non autorisé (token requis)' }, { status: 401 });
    }

    const { data: { user } } = await supabase.auth.getUser(authToken);
    userId = user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé (user introuvable)' }, { status: 401 });
    }

    // Vérifier si le token existe déjà
    const { data: existingToken } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('token', token)
      .single();

    if (existingToken) {
      // Mettre à jour le token existant
      await supabase
        .from('device_tokens')
        .update({
          user_id: userId,
          platform,
          updated_at: new Date().toISOString()
        })
        .eq('token', token);
    } else {
      // Créer un nouveau token
      await supabase
        .from('device_tokens')
        .insert({
          token,
          user_id: userId,
          platform,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Erreur enregistrement device token:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

