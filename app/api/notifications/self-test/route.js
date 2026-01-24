import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from '../../../../lib/apns';

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return null;
  return authHeader.slice(7).trim();
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

async function getAuthedUser(request) {
  const token = getBearerToken(request);
  if (!token) return { user: null, error: 'Authorization Bearer requis' };

  const supabaseAdmin = getSupabaseAdmin();
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: error?.message || 'Token invalide/expiré' };
  }
  return { user: data.user, error: null };
}

export async function GET(request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error }, { status: 401 });

    const supabaseAdmin = getSupabaseAdmin();
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('device_tokens')
      .select('platform, created_at, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (tokensError) {
      return NextResponse.json(
        { error: 'Erreur lecture device_tokens', details: tokensError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      user_id: user.id,
      email: user.email,
      count: (tokens || []).length,
      tokens: tokens || [],
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: e?.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { user, error } = await getAuthedUser(request);
    if (!user) return NextResponse.json({ error }, { status: 401 });

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
          total: 0,
          error: "Aucun token trouvé. Ouvre l'app, accepte les notifications, puis déconnecte/reconnecte-toi.",
        },
        { status: 400 }
      );
    }

    const iosTokens = tokens.filter((t) => t.platform === 'ios').map((t) => t.token);
    const androidTokens = tokens.filter((t) => t.platform === 'android').map((t) => t.token);

    let sent = 0;
    const errors = [];

    const title = 'Test CVN’EAT';
    const message = 'Notification de test (si tu vois ça, les pushes sont OK)';
    const payload = { type: 'self_test' };

    // iOS via APNs
    for (const t of iosTokens) {
      try {
        await sendAPNsNotification(t, title, message, payload);
        sent += 1;
      } catch (err) {
        // Nettoyage automatique des tokens invalides (APNs 410 Unregistered, BadDeviceToken, etc.)
        const apnsStatus = err?.apnsStatus;
        const apnsReason = (err?.apnsReason || err?.message || '').toString();
        const shouldDelete =
          apnsStatus === 410 ||
          apnsReason.includes('Unregistered') ||
          apnsReason.includes('BadDeviceToken') ||
          apnsReason.includes('DeviceTokenNotForTopic');

        if (shouldDelete) {
          try {
            await supabaseAdmin.from('device_tokens').delete().eq('token', t);
            console.log('🧹 [self-test] Token iOS supprimé (APNs invalid):', (t || '').slice(0, 10) + '...');
          } catch (delErr) {
            console.warn('⚠️ [self-test] Échec suppression token iOS invalid:', delErr?.message || delErr);
          }
        }
        errors.push({
          platform: 'ios',
          token_preview: (t || '').slice(0, 12) + '…',
          error: err?.message || 'Erreur APNs',
        });
      }
    }

    // Android via FCM (optionnel)
    const fcmServerKey = process.env.FIREBASE_SERVER_KEY;
    if (androidTokens.length > 0) {
      if (!fcmServerKey) {
        errors.push({ platform: 'android', error: 'Firebase non configuré' });
      } else {
        for (const t of androidTokens) {
          try {
            const response = await fetch('https://fcm.googleapis.com/fcm/send', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `key=${fcmServerKey}`,
              },
              body: JSON.stringify({
                to: t,
                notification: { title, body: message, sound: 'default' },
                data: payload,
                priority: 'high',
              }),
            });
            if (response.ok) sent += 1;
            else {
              const errorText = await response.text();
              errors.push({ platform: 'android', token_preview: (t || '').slice(0, 12) + '…', error: errorText });
            }
          } catch (err) {
            errors.push({ platform: 'android', token_preview: (t || '').slice(0, 12) + '…', error: err?.message });
          }
        }
      }
    }

    return NextResponse.json({
      sent,
      total: tokens.length,
      ios: iosTokens.length,
      android: androidTokens.length,
      errors: errors.length ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json({ error: 'Erreur serveur', details: e?.message }, { status: 500 });
  }
}


