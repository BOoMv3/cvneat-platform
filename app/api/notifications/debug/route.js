import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from '../../../../lib/apns';

/**
 * Endpoint de diagnostic push (iOS/Android)
 * - GET  : retourne les tokens device de l'utilisateur connecté (via Authorization: Bearer <access_token>)
 * - POST : envoie un push de test à l'utilisateur connecté (iOS via APNs, Android via FCM si configuré)
 *
 * IMPORTANT: destiné au debug uniquement (admin/dev).
 * Sécurité:
 * - En production, exige `PUSH_DEBUG_SECRET` + header `x-debug-secret`.
 */

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

function requireDebugSecretOrBlock(request) {
  // En prod: on bloque si pas de secret configuré, ou si secret incorrect
  if (process.env.NODE_ENV === 'production') {
    const expected = (process.env.PUSH_DEBUG_SECRET || '').toString().trim();
    if (!expected) return { ok: false };
    const got = (request.headers.get('x-debug-secret') || '').toString().trim();
    if (got !== expected) return { ok: false };
  }
  return { ok: true };
}

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

async function getAuthedUser(request) {
  const token = getBearerToken(request);
  if (!token) {
    return { user: null, error: 'Authorization Bearer requis' };
  }
  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || 'Token invalide/expiré' };
  }
  return { user: data.user, error: null };
}

export async function GET(request) {
  try {
    const gate = requireDebugSecretOrBlock(request);
    if (!gate.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { user, error } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('device_tokens')
      .select('id, platform, token, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokensError) {
      return NextResponse.json(
        { error: 'Erreur lecture device_tokens', details: tokensError.message },
        { status: 500 }
      );
    }

    // Ne jamais renvoyer le token complet (PII). On renvoie un aperçu.
    const safeTokens = (tokens || []).map((t) => ({
      id: t.id,
      platform: t.platform,
      token_preview: (t.token || '').slice(0, 12) + '…',
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      tokens: safeTokens,
      count: safeTokens.length,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: e?.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const gate = requireDebugSecretOrBlock(request);
    if (!gate.ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { user, error } = await getAuthedUser(request);
    if (!user) {
      return NextResponse.json({ error }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const title = (body?.title || 'Test push CVN’EAT').toString();
    const message = (body?.body || 'Notification de test (iOS/Android)').toString();
    const payload = body?.data && typeof body.data === 'object' ? body.data : {};

    const supabaseAdmin = getSupabaseAdmin();
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('device_tokens')
      .select('token, platform')
      .eq('user_id', user.id);

    if (tokensError) {
      return NextResponse.json(
        { error: 'Erreur lecture device_tokens', details: tokensError.message },
        { status: 500 }
      );
    }

    if (!tokens || tokens.length === 0) {
      return NextResponse.json(
        {
          sent: 0,
          error: 'Aucun token trouvé pour cet utilisateur. Ouvre l’app, accepte les notifs, connecte-toi, puis réessaie.',
        },
        { status: 400 }
      );
    }

    const iosTokens = tokens.filter((t) => t.platform === 'ios').map((t) => t.token);
    const androidTokens = tokens.filter((t) => t.platform === 'android').map((t) => t.token);

    let sent = 0;
    const errors = [];

    // iOS via APNs
    for (const t of iosTokens) {
      try {
        await sendAPNsNotification(t, title, message, {
          ...payload,
          type: payload?.type || 'debug_test',
        });
        sent += 1;
      } catch (err) {
        errors.push({
          platform: 'ios',
          token_preview: (t || '').slice(0, 12) + '…',
          error: err?.message || 'Erreur APNs',
        });
      }
    }

    // Android via FCM (optionnel)
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY;
    if (androidTokens.length > 0 && fcmServerKey) {
      for (const t of androidTokens) {
        try {
          const resp = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `key=${fcmServerKey}`,
            },
            body: JSON.stringify({
              to: t,
              notification: { title, body: message, sound: 'default', badge: 1 },
              data: payload || {},
              priority: 'high',
            }),
          });
          if (resp.ok) sent += 1;
          else {
            const txt = await resp.text();
            errors.push({ platform: 'android', token_preview: (t || '').slice(0, 12) + '…', error: txt });
          }
        } catch (err) {
          errors.push({
            platform: 'android',
            token_preview: (t || '').slice(0, 12) + '…',
            error: err?.message || 'Erreur FCM',
          });
        }
      }
    }

    return NextResponse.json({
      sent,
      total_tokens: tokens.length,
      ios: iosTokens.length,
      android: androidTokens.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: e?.message }, { status: 500 });
  }
}


