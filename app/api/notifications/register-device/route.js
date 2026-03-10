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
    const raw = (await request.json()) || {};
    const token = raw.token;
    const rawPlatform = (raw.platform || 'web').toString().toLowerCase().trim();
    const platform = ['ios', 'android', 'web'].includes(rawPlatform) ? rawPlatform : 'web';

    if (!token) {
      return NextResponse.json(
        { error: 'Token requis' },
        { status: 400 }
      );
    }

    const tokenPreview = `${token}`.slice(0, 12) + '…';
    console.log('🔔 [register-device] Reçu', { platform, tokenPreview });

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
      console.warn('❌ [register-device] Aucun auth token (Bearer/cookie) pour', { tokenPreview });
      return NextResponse.json({ error: 'Non autorisé (token requis)' }, { status: 401 });
    }

    const { data: { user }, error: authErr } = await supabase.auth.getUser(authToken);
    userId = user?.id;

    if (!userId) {
      console.warn('❌ [register-device] User introuvable via auth token', { tokenPreview, authErr: authErr?.message });
      return NextResponse.json({ error: 'Non autorisé (user introuvable)' }, { status: 401 });
    }

    console.log('✅ [register-device] Auth OK', { userId, platform, tokenPreview });

    // Vérifier si le token existe déjà
    const { data: existingToken, error: existingError } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('token', token)
      .single();

    // NOTE: en cas de "no rows", Supabase renvoie souvent une erreur PGRST116.
    if (existingError && existingError.code !== 'PGRST116') {
      console.warn('⚠️ [register-device] Erreur lookup existing token', {
        tokenPreview,
        code: existingError.code,
        msg: existingError.message
      });
    }

    if (existingToken?.id) {
      // Mettre à jour le token existant
      const { error: updateError } = await supabase
        .from('device_tokens')
        .update({
          user_id: userId,
          platform,
          updated_at: new Date().toISOString()
        })
        .eq('token', token);
      if (updateError) {
        console.error('❌ [register-device] Erreur update device_tokens', {
          tokenPreview,
          userId,
          platform,
          msg: updateError.message,
          code: updateError.code
        });
        return NextResponse.json(
          { error: 'Erreur update device_tokens', details: updateError.message, code: updateError.code },
          { status: 500 }
        );
      }
      console.log('✅ [register-device] Token mis à jour', { tokenPreview, userId, platform });
      return NextResponse.json({ success: true, action: 'updated', userId, platform });
    } else {
      // Créer un nouveau token
      const { error: insertError } = await supabase
        .from('device_tokens')
        .insert({
          token,
          user_id: userId,
          platform,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      if (insertError) {
        console.error('❌ [register-device] Erreur insert device_tokens', {
          tokenPreview,
          userId,
          platform,
          msg: insertError.message,
          code: insertError.code
        });
        return NextResponse.json(
          { error: 'Erreur insert device_tokens', details: insertError.message, code: insertError.code },
          { status: 500 }
        );
      }
      console.log('✅ [register-device] Token inséré', { tokenPreview, userId, platform });
      return NextResponse.json({ success: true, action: 'inserted', userId, platform });
    }

  } catch (error) {
    console.error('Erreur enregistrement device token:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

