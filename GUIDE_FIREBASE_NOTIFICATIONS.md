# 🔔 Guide : Configuration Firebase pour les Notifications Push

Ce guide explique comment configurer Firebase Cloud Messaging (FCM) pour envoyer des notifications push aux livreurs et restaurants via l'app mobile.

## ✅ Ce qui a été configuré

1. **Plugin Capacitor** : `@capacitor/push-notifications` installé
2. **Service de notifications** : `lib/capacitor-push-notifications.js`
3. **APIs serveur** :
   - `/api/notifications/register-device` : Enregistre les tokens FCM
   - `/api/notifications/send-push` : Envoie les notifications
4. **Table Supabase** : `device_tokens` pour stocker les tokens

## 🚀 Étapes de configuration Firebase

### Étape 1 : Créer un projet Firebase (GRATUIT)

1. Aller sur https://console.firebase.google.com/
2. Cliquer sur "Ajouter un projet"
3. Nom du projet : `cvneat` ou `cvneat-notifications`
4. Désactiver Google Analytics (optionnel)
5. Cliquer sur "Créer le projet"

### Étape 2 : Ajouter l'app Android

1. Dans la console Firebase, cliquer sur l'icône Android
2. Remplir :
   - **Nom du package** : `fr.cvneat.app`
   - **Nom de l'app** : `CVN'EAT`
3. Cliquer sur "Enregistrer l'application"
4. **Télécharger `google-services.json`**
5. Placer le fichier dans : `android/app/google-services.json`

### Étape 3 : Récupérer la Server Key

1. Dans Firebase Console → Paramètres du projet (roue dentée)
2. Onglet "Cloud Messaging"
3. Copier la **"Server key"** (ou créer une nouvelle clé)

### Étape 4 : Ajouter les variables d'environnement

Dans Vercel (ou `.env.local`) :

```env
# Firebase Server Key (pour envoyer les notifications depuis le serveur)
FIREBASE_SERVER_KEY=votre_server_key_ici

# Firebase Config (optionnel, pour le client)
NEXT_PUBLIC_FIREBASE_API_KEY=votre_api_key
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=votre_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=votre_app_id
```

### Étape 5 : Créer la table Supabase

Exécuter cette requête SQL dans Supabase :

```sql
CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT CHECK (platform IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tokens" ON device_tokens
  FOR ALL USING (auth.uid() = user_id);
```

### Étape 6 : Configurer Android

Le fichier `android/app/build.gradle` doit inclure :

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

Et `android/build.gradle` :

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

### Étape 7 : Synchroniser Capacitor

```bash
npm run capacitor:sync
```

## 📱 Comment ça fonctionne

### Flux d'inscription

1. L'utilisateur ouvre l'app mobile
2. L'app demande la permission de notifications
3. Si accepté, l'app reçoit un token FCM
4. Le token est envoyé au serveur via `/api/notifications/register-device`
5. Le serveur stocke le token dans la table `device_tokens`

### Flux d'envoi de notification

1. Une nouvelle commande arrive
2. Le serveur appelle `/api/notifications/send-push`
3. L'API récupère les tokens des utilisateurs concernés
4. L'API envoie la notification via Firebase FCM
5. L'utilisateur reçoit la notification même si l'app est fermée

## 🔧 Utilisation dans le code

### Envoyer une notification à un utilisateur

```javascript
await fetch('/api/notifications/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'uuid-de-l-utilisateur',
    title: 'Nouvelle commande !',
    body: 'Vous avez reçu une nouvelle commande',
    data: { orderId: '123', type: 'new_order' }
  })
});
```

### Envoyer une notification à tous les livreurs

```javascript
await fetch('/api/notifications/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'livreur',
    title: 'Commande disponible !',
    body: 'Une nouvelle commande est disponible pour livraison',
    data: { type: 'delivery_available' }
  })
});
```

### Envoyer une notification à tous les restaurants

```javascript
await fetch('/api/notifications/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    role: 'restaurant',
    title: 'Nouvelle commande !',
    body: 'Vous avez reçu une nouvelle commande',
    data: { orderId: '123', type: 'new_order' }
  })
});
```

## 🔗 Intégration avec les commandes existantes

Pour envoyer automatiquement des notifications lors d'une nouvelle commande, ajouter dans le webhook Stripe ou l'API de confirmation de paiement :

```javascript
// Après confirmation du paiement
// Notifier le restaurant
await fetch('/api/notifications/send-push', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: restaurantUserId,
    title: '🍔 Nouvelle commande !',
    body: `Commande #${orderId} - ${totalAmount}€`,
    data: { orderId, type: 'new_order' }
  })
});
```

## ⚠️ Important

- **Le site web n'est pas impacté** : Le code de push notifications ne s'exécute que dans l'app native
- **Firebase est gratuit** : Pour l'envoi de notifications push
- **iOS nécessite un Mac** : Pour ajouter la plateforme iOS et configurer APNs

## 📊 Coûts

| Service | Coût |
|---------|------|
| Firebase Cloud Messaging | **Gratuit** (illimité) |
| Google Play (publication) | 25$ (une fois) |
| Apple Developer (publication) | 99$/an |

## 🐛 Dépannage

### Les notifications ne sont pas reçues

1. Vérifier que `google-services.json` est dans `android/app/`
2. Vérifier que `FIREBASE_SERVER_KEY` est configuré
3. Vérifier que l'utilisateur a accepté les permissions
4. Vérifier les logs dans Firebase Console

### Token non enregistré

1. Vérifier que l'utilisateur est connecté
2. Vérifier la table `device_tokens` dans Supabase
3. Vérifier les logs de l'API `/api/notifications/register-device`

---

**✅ Configuration terminée !** Les notifications push natives sont prêtes à être utilisées une fois Firebase configuré.

