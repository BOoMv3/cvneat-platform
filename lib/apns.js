import apn from 'apn';

// On garde 2 providers séparés: sandbox + production
let apnProviderProd = null;
let apnProviderSandbox = null;

/**
 * Créer et retourner le provider APNs
 * Utilise les credentials configurés dans les variables d'environnement
 */
export const getAPNsProvider = () => {
  // Compat: garder l'API existante (retourne le provider "par défaut")
  // Mais privilégier getAPNsProviderForEnv() ci-dessous pour choisir l'env.
  const defaultIsProd = process.env.NODE_ENV === 'production';
  return getAPNsProviderForEnv(defaultIsProd ? 'production' : 'sandbox');
};

/**
 * Retourne un provider APNs pour un environnement donné.
 * @param {'production'|'sandbox'} env
 */
export const getAPNsProviderForEnv = (env = 'production') => {
  const isProd = env === 'production';
  if (isProd && apnProviderProd) return apnProviderProd;
  if (!isProd && apnProviderSandbox) return apnProviderSandbox;

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const keyContent = process.env.APNS_KEY_CONTENT;

  if (!keyId || !teamId || !bundleId || !keyContent) {
    console.error('❌ Configuration APNs manquante. Vérifiez les variables d\'environnement :');
    console.error('   - APNS_KEY_ID:', keyId ? '✅' : '❌');
    console.error('   - APNS_TEAM_ID:', teamId ? '✅' : '❌');
    console.error('   - APNS_BUNDLE_ID:', bundleId ? '✅' : '❌');
    console.error('   - APNS_KEY_CONTENT:', keyContent ? '✅' : '❌');
    return null;
  }

  try {
    // Convertir les \n échappés en vrais retours à la ligne (car stocké sur une ligne dans .env)
    const keyContentWithNewlines = keyContent.replace(/\\n/g, '\n');
    
    // Créer le provider APNs
    const provider = new apn.Provider({
      token: {
        key: Buffer.from(keyContentWithNewlines, 'utf8'),
        keyId: keyId,
        teamId: teamId
      },
      // IMPORTANT:
      // - production: true  => endpoint APNs "production"
      // - production: false => endpoint APNs "sandbox"
      production: isProd
    });

    if (isProd) apnProviderProd = provider;
    else apnProviderSandbox = provider;

    console.log(`✅ Provider APNs créé avec succès (${isProd ? 'production' : 'sandbox'})`);
    return provider;
  } catch (error) {
    console.error('❌ Erreur création provider APNs:', error);
    return null;
  }
};

/**
 * Envoyer une notification push via APNs
 * @param {string} deviceToken - Le token de l'appareil iOS
 * @param {string} title - Titre de la notification
 * @param {string} body - Corps de la notification
 * @param {object} data - Données supplémentaires (optionnel)
 * @returns {Promise} Résultat de l'envoi
 */
export const sendAPNsNotification = async (deviceToken, title, body, data = {}) => {
  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.sound = 'default';
  notification.badge = 1;
  notification.topic = process.env.APNS_BUNDLE_ID || 'fr.cvneat.app';
  notification.payload = data;
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expire dans 1 heure

  // Force optionnelle via variable d'environnement
  // APNS_FORCE_ENV = 'production' | 'sandbox'
  const forcedEnv = (process.env.APNS_FORCE_ENV || '').toString().trim().toLowerCase();
  const force =
    forcedEnv === 'production' ? 'production' :
    forcedEnv === 'sandbox' ? 'sandbox' :
    null;

  // Stratégie:
  // - Par défaut on tente d'abord "production" en prod, "sandbox" sinon
  // - Si ça échoue avec des raisons typiques de mauvais environnement (BadDeviceToken...),
  //   on retente dans l'autre environnement.
  const primaryEnv =
    force ||
    (process.env.NODE_ENV === 'production' ? 'production' : 'sandbox');
  const secondaryEnv = primaryEnv === 'production' ? 'sandbox' : 'production';

  const shouldRetryInOtherEnv = (reason = '') => {
    const r = (reason || '').toString();
    // Raisons classiques quand on tape le mauvais endpoint ou mauvais topic
    return (
      r.includes('BadDeviceToken') ||
      r.includes('DeviceTokenNotForTopic') ||
      r.includes('TopicDisallowed') ||
      r.includes('InvalidProviderToken') ||
      r.includes('InvalidToken')
    );
  };

  const sendWithEnv = async (env) => {
    const provider = getAPNsProviderForEnv(env);
    if (!provider) {
      throw new Error(`Provider APNs non disponible (${env}) - Vérifiez la configuration`);
    }
    const result = await provider.send(notification, deviceToken);
    const failed = result?.failed || [];
    if (failed.length > 0) {
      const f = failed[0];
      const reason = f?.response?.reason || 'Unknown error';
      const status = f?.status;
      const err = new Error(`Erreur APNs (${env}): ${status} - ${reason}`);
      err.apnsEnv = env;
      err.apnsReason = reason;
      err.apnsStatus = status;
      throw err;
    }
    return { env, result };
  };

  try {
    const first = await sendWithEnv(primaryEnv);
    if (first?.result?.sent?.length > 0) {
      console.log(
        `✅ Notification APNs envoyée (${primaryEnv}) à`,
        deviceToken.substring(0, 10) + '...'
      );
    }
    return first.result;
  } catch (error) {
    const reason = error?.apnsReason || error?.message || '';
    if (!force && shouldRetryInOtherEnv(reason)) {
      try {
        const second = await sendWithEnv(secondaryEnv);
        if (second?.result?.sent?.length > 0) {
          console.log(
            `✅ Notification APNs envoyée (${secondaryEnv}, fallback) à`,
            deviceToken.substring(0, 10) + '...'
          );
        }
        return second.result;
      } catch (error2) {
        console.error('❌ Erreur envoi notification APNs (fallback):', error2);
        // Remonter l'erreur fallback (plus pertinente)
        throw error2;
      }
    }

    console.error('❌ Erreur envoi notification APNs:', error);
    throw error;
  }
};

