import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAPNsNotification } from '../../../../lib/apns';

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
    const { userId, title, body, data, role } = await request.json();

    if (!title || !body) {
      return NextResponse.json(
        { error: 'Titre et corps requis' },
        { status: 400 }
      );
    }

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

    // PostgREST: les filtres `.eq()` / `.in()` sont sensibles à la casse et aux espaces.
    // On utilise donc `.or(role.ilike.X%)` pour matcher "Delivery", "delivery ", etc.
    const buildRoleOrFilter = (candidates) => {
      if (!Array.isArray(candidates) || candidates.length === 0) return null;
      // Roles attendus: simples (letters), donc pas besoin d'escape complexe.
      // On tolère des espaces en fin via wildcard "%".
      return candidates.map((r) => `role.ilike.${r}%`).join(',');
    };

    // Récupérer les tokens de l'utilisateur ou du rôle
    let query = supabase.from('device_tokens').select('token, platform');

    if (userId) {
      query = query.eq('user_id', userId);
    } else if (role) {
      // Récupérer les tokens des utilisateurs avec ce rôle
      const roleOr = buildRoleOrFilter(roleCandidates);
      const usersQuery = supabase.from('users').select('id');
      const { data: users } = roleOr
        ? await usersQuery.or(roleOr)
        : await usersQuery.eq('role', role);

      if (users && users.length > 0) {
        const userIds = users.map(u => u.id);
        query = query.in('user_id', userIds);
      } else {
        return NextResponse.json({ sent: 0, message: 'Aucun utilisateur trouvé' });
      }
    }

    const { data: tokens, error } = await query;

    if (error || !tokens || tokens.length === 0) {
      return NextResponse.json({ sent: 0, message: 'Aucun token trouvé' });
    }

    // Séparer les tokens iOS et Android
    const iosTokens = tokens.filter(t => t.platform === 'ios');
    const androidTokens = tokens.filter(t => t.platform === 'android');

    let sentCount = 0;
    const errors = [];

    // Envoyer aux appareils iOS via APNs (Apple Push Notification service)
    if (iosTokens.length > 0) {
      for (const tokenData of iosTokens) {
        try {
          await sendAPNsNotification(
            tokenData.token,
            title,
            body,
            data || {}
          );
          sentCount++;
        } catch (err) {
          console.error('❌ Erreur envoi push iOS:', err);
          errors.push({ 
            token: tokenData.token.substring(0, 10) + '...', 
            error: err.message,
            platform: 'ios'
          });
        }
      }
    }

    // Envoyer aux appareils Android via Firebase Cloud Messaging
    if (androidTokens.length > 0) {
      const fcmServerKey = process.env.FIREBASE_SERVER_KEY;
      
      if (!fcmServerKey) {
        console.log('Firebase Server Key non configurée - notifications Android non envoyées');
        errors.push({ platform: 'android', error: 'Firebase non configuré' });
      } else {
        for (const tokenData of androidTokens) {
          try {
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
                  sound: 'default',
                  // Ne pas forcer de badge par défaut (sinon badge fantôme).
                },
                data: data || {},
                priority: 'high'
              })
            });

            if (response.ok) {
              sentCount++;
            } else {
              const errorText = await response.text();
              errors.push({ token: tokenData.token.substring(0, 10) + '...', error: errorText });
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

