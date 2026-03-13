import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from '../../../../lib/apns';
import { sendFcmV1Message, isFcmV1Configured } from '../../../../lib/fcm-v1';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * API pour envoyer des notifications push via Firebase Cloud Messaging
 * Utilisé pour notifier les livreurs et restaurants via l'app mobile
 */
export async function POST(request) {
  try {
    const { userId, title, body, data, role, sound } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Titre et corps requis' },
        { status: 400 }
      );
    }

    const soundName =
      typeof sound === 'string' && sound.trim().length > 0 ? sound.trim() : null;

    const normalizeRole = (r) => (r || '').toString().trim().toLowerCase();
    const requestedRole = normalizeRole(role);
    const roleCandidates = (() => {
      // Compat: accepter plusieurs valeurs historiques en DB
      // (on a déjà vu "delivery" vs "livreur", et "partner" vs "restaurant")
      if (!requestedRole) return [];
      if (requestedRole === 'delivery' || requestedRole === 'livreur') {
        return ['delivery', 'livreur'];
      }
      if (requestedRole === 'restaurant' || requestedRole === 'partner') {
        return ['restaurant', 'partner'];
      }
      return [requestedRole];
    })();

    // Récupérer les tokens de l'utilisateur ou du rôle
    let query = supabase.from('device_tokens').select('token, platform');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (role) {
      // Requête users: .in('role', [...]) fiable; fallback .or(ilike) si 0 résultat (casse / variantes)
      let usersQuery = supabase.from('users').select('id');
      let users = [];
      let usersErr = null;

      if (roleCandidates.length > 0) {
        const { data: byIn, error: errIn } = await usersQuery.in('role', roleCandidates);
        usersErr = errIn;
        users = byIn || [];
      }
      if ((!users || users.length === 0) && roleCandidates.length > 0) {
        const roleOr = roleCandidates.map((r) => `role.ilike.%${r}%`).join(',');
        const { data: byIlike, error: errIlike } = await supabase.from('users').select('id').or(roleOr);
        if (!usersErr) usersErr = errIlike;
        if (byIlike && byIlike.length > 0) users = byIlike;
      }
      if (requestedRole && (!users || users.length === 0)) {
        const { data: byEq, error: errEq } = await supabase.from('users').select('id').eq('role', requestedRole);
        if (!usersErr) usersErr = errEq;
        if (byEq && byEq.length > 0) users = byEq;
      }

      if (usersErr) {
        console.error('❌ [send-push] Erreur users rôle', requestedRole, usersErr);
        return NextResponse.json({ sent: 0, message: 'Erreur users' }, { status: 500 });
      }
      if (users && users.length > 0) {
        const userIds = users.map((u) => u.id);
        query = query.in('user_id', userIds);
        console.log(`📱 [send-push] Rôle ${requestedRole}: ${users.length} user(s), ${userIds.length} id(s)`);
      } else {
        console.warn('⚠️ [send-push] Aucun user pour rôle', requestedRole, 'candidates:', roleCandidates);
        return NextResponse.json({ sent: 0, message: 'Aucun utilisateur trouvé pour ce rôle' });
      }
    }

    const { data: tokens, error } = await query;

    if (error) {
      console.error('❌ [send-push] Erreur device_tokens', error);
      return NextResponse.json({ sent: 0, message: 'Erreur tokens' }, { status: 500 });
    }
    if (!tokens || tokens.length === 0) {
      console.warn('⚠️ [send-push] Aucun token trouvé pour la cible');
      return NextResponse.json({ sent: 0, message: 'Aucun token trouvé' });
    }
    console.log(`📱 [send-push] ${tokens.length} token(s) à envoyer`);

    // Séparer les tokens iOS et Android (tolérance casse: iOS, ios, IOS)
    const platformNorm = (p) => (p || '').toString().toLowerCase().trim();
    const iosTokens = tokens.filter(t => platformNorm(t.platform) === 'ios');
    const androidTokens = tokens.filter(t => platformNorm(t.platform) === 'android');

    let sentCount = 0;
    const errors = [];

    // Envoyer aux appareils iOS via APNs (Apple Push Notification service)
    if (iosTokens.length > 0) {
      console.log(`📱 Envoi APNs: ${iosTokens.length} token(s) iOS`);
      for (const tokenData of iosTokens) {
        try {
          await sendAPNsNotification(
            tokenData.token,
            title,
            body,
            { ...(data || {}), ...(soundName ? { sound: soundName } : {}) }
          );
          sentCount++;
        } catch (err) {
          console.error('❌ Erreur envoi push iOS:', err);
          // Nettoyage automatique des tokens invalides (souvent après réinstall / rebuild Xcode)
          // APNs retourne typiquement 410 Unregistered ou BadDeviceToken.
          const apnsStatus = err?.apnsStatus;
          const apnsReason = (err?.apnsReason || err?.message || '').toString();
          const shouldDelete =
            apnsStatus === 410 ||
            apnsReason.includes('Unregistered') ||
            apnsReason.includes('BadDeviceToken') ||
            apnsReason.includes('DeviceTokenNotForTopic');

          if (shouldDelete) {
            try {
              await supabase.from('device_tokens').delete().eq('token', tokenData.token);
              console.log('🧹 Token iOS supprimé (APNs invalid):', tokenData.token.substring(0, 10) + '...');
            } catch (delErr) {
              console.warn('⚠️ Échec suppression token iOS invalid:', delErr?.message || delErr);
            }
          }
          errors.push({ 
            token: tokenData.token.substring(0, 10) + '...', 
            error: err.message,
            platform: 'ios'
          });
        }
      }
    }

    // Envoyer aux appareils Android via FCM (v1 prioritaire, sinon legacy, avec Fallback auto)
    if (androidTokens.length > 0) {
      const useV1 = isFcmV1Configured();
      const fcmServerKey = process.env.FIREBASE_SERVER_KEY;

      if (!useV1 && !fcmServerKey) {
        console.log('Firebase non configuré (ni compte de service v1, ni Server key) - notifications Android non envoyées');
        errors.push({ platform: 'android', error: 'Firebase non configuré' });
      } else {
        for (const tokenData of androidTokens) {
          try {
            let v1Tried = false;
            let v1Ok = false;

            // 1) Tentative FCM v1 si configuré
            if (useV1) {
              v1Tried = true;
              const result = await sendFcmV1Message(
                tokenData.token,
                title,
                body,
                { ...(data || {}), ...(soundName ? { sound: soundName } : {}) },
                soundName || null
              );
              if (result.ok) {
                v1Ok = true;
                sentCount++;
              } else {
                console.warn('⚠️ FCM v1 échec, erreur:', result.error);
              }
            }

            // 2) Fallback automatique sur l’API legacy si une Server key est présente
            if ((!v1Tried || !v1Ok) && fcmServerKey) {
              const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `key=${fcmServerKey}`
                },
                body: JSON.stringify({
                  to: tokenData.token,
                  notification: {
                    title,
                    body,
                    sound: soundName || 'default',
                  },
                  data: { ...(data || {}), ...(soundName ? { sound: soundName } : {}) },
                  priority: 'high'
                })
              });

              if (response.ok) {
                sentCount++;
              } else {
                const errorText = await response.text();
                console.warn('⚠️ FCM legacy échec:', errorText);
                errors.push({ token: tokenData.token.substring(0, 10) + '...', error: errorText });
              }
            }
          } catch (err) {
            errors.push({ token: tokenData.token.substring(0, 10) + '...', error: err.message });
          }
        }
      }
    }

    return NextResponse.json({ 
      sent: sentCount, 
      total: tokens.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Erreur envoi push notification:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

