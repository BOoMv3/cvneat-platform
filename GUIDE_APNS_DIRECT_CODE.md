# 🔔 Guide : Configuration APNs Directement dans le Code

## ⚠️ Pourquoi cette méthode ?

Supabase ne propose **pas d'interface native** dans le dashboard pour configurer APNs. Nous allons donc configurer APNs directement dans notre code en utilisant les credentials Apple.

## 📋 Prérequis

- ✅ Clé APNs créée dans Apple Developer (fichier `.p8`)
- ✅ Key ID noté
- ✅ Team ID noté
- ✅ Fichier `.p8` téléchargé

## 🚀 Configuration

### Étape 1 : Ajouter les Variables d'Environnement

**Dans `.env.local` (local) ou Vercel (production)** :

```env
# APNs Configuration
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_BUNDLE_ID=fr.cvneat.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

**⚠️ IMPORTANT** :
- `APNS_KEY_ID` : Le Key ID noté lors de la création de la clé
- `APNS_TEAM_ID` : L'équipe ID (visible en haut à droite de Apple Developer)
- `APNS_BUNDLE_ID` : `fr.cvneat.app`
- `APNS_KEY_CONTENT` : Le contenu COMPLET du fichier `.p8` (avec les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)

### Étape 2 : Installer la Bibliothèque APNs

```bash
npm install apn
```

### Étape 3 : Créer un Module APNs

Créer le fichier `lib/apns.js` :

```javascript
import apn from 'apn';

let apnProvider = null;

export const getAPNsProvider = () => {
  if (apnProvider) {
    return apnProvider;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const keyContent = process.env.APNS_KEY_CONTENT;

  if (!keyId || !teamId || !bundleId || !keyContent) {
    console.error('❌ Configuration APNs manquante');
    return null;
  }

  try {
    // Créer le provider APNs
    apnProvider = new apn.Provider({
      token: {
        key: Buffer.from(keyContent, 'utf8'),
        keyId: keyId,
        teamId: teamId
      },
      production: true // Utiliser true pour la production, false pour le développement
    });

    console.log('✅ Provider APNs créé avec succès');
    return apnProvider;
  } catch (error) {
    console.error('❌ Erreur création provider APNs:', error);
    return null;
  }
};

export const sendAPNsNotification = async (deviceToken, title, body, data = {}) => {
  const provider = getAPNsProvider();
  
  if (!provider) {
    throw new Error('Provider APNs non disponible');
  }

  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.sound = 'default';
  notification.badge = 1;
  notification.topic = process.env.APNS_BUNDLE_ID;
  notification.payload = data;

  try {
    const result = await provider.send(notification, deviceToken);
    
    if (result.failed && result.failed.length > 0) {
      console.error('❌ Erreur envoi notification APNs:', result.failed);
      throw new Error('Erreur envoi notification APNs');
    }
    
    console.log('✅ Notification APNs envoyée avec succès');
    return result;
  } catch (error) {
    console.error('❌ Erreur envoi notification APNs:', error);
    throw error;
  }
};
```

### Étape 4 : Mettre à Jour l'API de Notifications

Mettre à jour `app/api/notifications/send-push/route.js` pour utiliser APNs :

```javascript
import { sendAPNsNotification } from '../../../../lib/apns';

// Dans la section iOS tokens :
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
      console.error('Erreur envoi push iOS:', err);
      errors.push({ token: tokenData.token.substring(0, 10) + '...', error: err.message });
    }
  }
}
```

## 🧪 Tester

1. **Installer les dépendances** : `npm install apn`
2. **Redémarrer le serveur** : `npm run dev`
3. **Tester l'envoi d'une notification** depuis l'app iOS

## ⚠️ Points Importants

1. **Production vs Development** :
   - Dans `lib/apns.js`, `production: true` pour la production
   - Mettre `production: false` pour les tests avec TestFlight

2. **Sécurité** :
   - Ne jamais commiter `.env.local` avec les credentials APNs
   - Utiliser les variables d'environnement dans Vercel pour la production

3. **Format du fichier `.p8`** :
   - Le contenu doit inclure les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`
   - Garder les retours à la ligne

## 🐛 Dépannage

### "Provider APNs non disponible"
- Vérifier que toutes les variables d'environnement sont définies
- Vérifier que le contenu du fichier `.p8` est correct

### "Invalid token"
- Vérifier que le Key ID et Team ID sont corrects
- Vérifier que le Bundle ID correspond (`fr.cvneat.app`)

### "Notification not sent"
- Vérifier que l'app est installée sur un iPhone physique (pas simulateur)
- Vérifier que les permissions push sont accordées dans l'app

