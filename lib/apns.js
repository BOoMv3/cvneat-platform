import apn from 'apn';

let apnProvider = null;

/**
 * Créer et retourner le provider APNs
 * Utilise les credentials configurés dans les variables d'environnement
 */
export const getAPNsProvider = () => {
  if (apnProvider) {
    return apnProvider;
  }

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
    apnProvider = new apn.Provider({
      token: {
        key: Buffer.from(keyContentWithNewlines, 'utf8'),
        keyId: keyId,
        teamId: teamId
      },
      production: process.env.NODE_ENV === 'production' // true pour production, false pour développement
    });

    console.log('✅ Provider APNs créé avec succès');
    return apnProvider;
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
  const provider = getAPNsProvider();
  
  if (!provider) {
    throw new Error('Provider APNs non disponible - Vérifiez la configuration');
  }

  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.sound = 'default';
  notification.badge = 1;
  notification.topic = process.env.APNS_BUNDLE_ID || 'fr.cvneat.app';
  notification.payload = data;
  notification.expiry = Math.floor(Date.now() / 1000) + 3600; // Expire dans 1 heure

  try {
    const result = await provider.send(notification, deviceToken);
    
    if (result.failed && result.failed.length > 0) {
      const error = result.failed[0];
      console.error('❌ Erreur envoi notification APNs:', error);
      throw new Error(`Erreur APNs: ${error.status} - ${error.response?.reason || 'Unknown error'}`);
    }
    
    if (result.sent && result.sent.length > 0) {
      console.log('✅ Notification APNs envoyée avec succès à', deviceToken.substring(0, 10) + '...');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi notification APNs:', error);
    throw error;
  }
};

