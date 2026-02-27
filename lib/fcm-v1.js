/**
 * Envoi de notifications push Android via Firebase Cloud Messaging HTTP v1 API.
 * Utilise un compte de service (OAuth 2.0) au lieu de l'ancienne Server key.
 */

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const FCM_SEND_URL = 'https://fcm.googleapis.com/v1/projects/%s/messages:send';

let cachedClient = null;

function getCredentials() {
  // 1) Priorité au JSON complet (plus simple à copier sur Vercel)
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      const key = data.private_key && typeof data.private_key === 'string' && data.private_key.includes('\\n')
        ? data.private_key.replace(/\\n/g, '\n')
        : data.private_key;
      if (data.project_id && data.client_email && key) {
        return {
          projectId: data.project_id,
          clientEmail: data.client_email,
          privateKey: key
        };
      }
    } catch (e) {
      console.warn('FCM v1: FIREBASE_SERVICE_ACCOUNT_JSON invalide', e?.message);
      // on continue avec les variables séparées si disponibles
    }
  }

  // 2) Fallback sur les 3 variables séparées
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (projectId && clientEmail && privateKey) {
    if (typeof privateKey === 'string' && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    return { projectId, clientEmail, privateKey };
  }

  return null;
}

async function getAccessToken() {
  const creds = getCredentials();
  if (!creds) return null;

  const { GoogleAuth } = await import('google-auth-library');
  const auth = new GoogleAuth({
    credentials: {
      client_email: creds.clientEmail,
      private_key: creds.privateKey
    },
    scopes: [FCM_SCOPE]
  });
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token || null;
}

/**
 * Envoie une notification FCM v1 à un token Android.
 * @param {string} token - Token FCM de l'appareil
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps du message
 * @param {object} data - Données additionnelles (toutes les valeurs doivent être des strings)
 * @param {string|null} sound - Nom du son (optionnel)
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendFcmV1Message(token, title, body, data = {}, sound = null) {
  const creds = getCredentials();
  if (!creds) {
    return { ok: false, error: 'FCM v1 non configuré (compte de service manquant)' };
  }

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return { ok: false, error: 'Impossible d\'obtenir un access token FCM' };
  }

  const url = FCM_SEND_URL.replace('%s', creds.projectId);

  const message = {
    token,
    notification: { title, body },
    data: Object.fromEntries(
      Object.entries(data || {}).map(([k, v]) => [k, String(v)])
    ),
    android: {
      priority: 'high',
      notification: {
        sound: sound || 'default'
      }
    }
  };

  if (sound && message.android.notification) {
    message.android.notification.sound = sound;
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`
      },
      body: JSON.stringify({ message })
    });

    if (response.ok) {
      return { ok: true };
    }

    const errText = await response.text();
    let errMsg = errText;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.error?.message || errText;
    } catch (_) {}
    return { ok: false, error: errMsg };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Indique si FCM v1 est configuré (compte de service présent).
 */
export function isFcmV1Configured() {
  return !!getCredentials();
}
