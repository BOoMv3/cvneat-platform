# 🔔 Guide : Notifications Push pour l'App Mobile

## ✅ Fonctionnement

### 📱 Pour les Livreurs

**Quand une notification est envoyée :**
- Dès qu'une commande passe en statut `en_preparation` (acceptée par le restaurant)
- Dès qu'une commande passe en statut `pret_a_livrer` (prête à être livrée)
- **Même si l'app est fermée** : Les notifications push fonctionnent en arrière-plan

**Comment ça marche :**
1. Le restaurant accepte une commande → statut passe à `en_preparation`
2. Le serveur détecte qu'il n'y a pas de livreur assigné (`livreur_id` est `null`)
3. Le serveur envoie une notification push FCM à **tous les livreurs** via `/api/notifications/send-push`
4. Les livreurs reçoivent la notification même si l'app est fermée
5. En cliquant sur la notification, l'app s'ouvre sur `/delivery/dashboard`

**Code concerné :**
- `app/api/restaurants/orders/[id]/route.js` : Envoie la notification quand le statut change
- `app/api/notifications/send-push/route.js` : API qui envoie les notifications FCM
- `lib/capacitor-push-notifications.js` : Initialise les notifications dans l'app

---

### 👤 Pour les Clients

**Quand une notification est envoyée :**
- **À chaque changement de statut** de leur commande :
  - `acceptee` → "Commande acceptée ! 🎉"
  - `en_preparation` → "En préparation 👨‍🍳"
  - `pret_a_livrer` → "Commande prête ! 📦"
  - `en_livraison` → "En livraison 🚚"
  - `livree` → "Commande livrée ! ✅"
  - `refusee` → "Commande refusée ❌"
  - `annulee` → "Commande annulée ❌"

**Même si l'app est fermée** : Les notifications push fonctionnent en arrière-plan

**Comment ça marche :**
1. Le restaurant change le statut d'une commande
2. Le serveur envoie une notification push FCM au **client spécifique** (via `user_id`)
3. Le client reçoit la notification même si l'app est fermée
4. En cliquant sur la notification, l'app s'ouvre sur `/orders/[id]`

**Code concerné :**
- `app/api/restaurants/orders/[id]/route.js` : Envoie la notification à chaque changement de statut
- `app/api/notifications/send-push/route.js` : API qui envoie les notifications FCM

---

## 🔧 Configuration Requise

### 1. Firebase Cloud Messaging (FCM)

**Variables d'environnement nécessaires :**
```env
FIREBASE_SERVER_KEY=votre_server_key_firebase
```

**Comment obtenir la Server Key :**
1. Aller sur https://console.firebase.google.com/
2. Sélectionner votre projet Firebase
3. Paramètres du projet (roue dentée) → Cloud Messaging
4. Copier la "Server key"

### 2. Table Supabase : `device_tokens`

Cette table stocke les tokens FCM de chaque appareil :
- `token` : Token FCM unique de l'appareil
- `user_id` : ID de l'utilisateur (livreur ou client)
- `platform` : `ios` ou `android`

**Création automatique :**
- Quand l'app démarre, elle enregistre automatiquement son token via `lib/capacitor-push-notifications.js`
- Le token est sauvegardé via `/api/notifications/register-device`

---

## 📱 Initialisation dans l'App

Les notifications sont **automatiquement initialisées** au démarrage de l'app :

1. **Layout principal** (`app/layout.js`) :
   - Inclut `<PushNotificationService />` qui initialise tout

2. **Service de notifications** (`app/components/PushNotificationService.js`) :
   - Détecte si on est dans l'app mobile (Capacitor)
   - Appelle `initPushNotifications()` de `lib/capacitor-push-notifications.js`

3. **Initialisation Capacitor** (`lib/capacitor-push-notifications.js`) :
   - Demande les permissions push
   - Enregistre le token FCM
   - Sauvegarde le token sur le serveur

---

## 🧪 Tester les Notifications

### Pour les Livreurs :
1. Connectez-vous en tant que livreur dans l'app
2. Fermez l'app complètement
3. Créez une commande test et acceptez-la (en tant que restaurant)
4. Le livreur devrait recevoir une notification push même si l'app est fermée

### Pour les Clients :
1. Connectez-vous en tant que client dans l'app
2. Passez une commande
3. Fermez l'app complètement
4. Changez le statut de la commande (en tant que restaurant)
5. Le client devrait recevoir une notification push à chaque changement de statut

---

## 🔍 Vérification

**Logs à vérifier dans la console Xcode :**
- `📱 Initialisation des notifications push Capacitor...`
- `Token push reçu: [token]`
- `✅ Notifications push Capacitor initialisées`

**Vérifier dans Supabase :**
- Table `device_tokens` : Vérifier que les tokens sont bien enregistrés
- Colonne `user_id` : Doit correspondre à l'utilisateur connecté
- Colonne `platform` : Doit être `ios` ou `android`

---

## ⚠️ Important

1. **Permissions iOS** : L'app doit demander les permissions de notification au premier lancement
2. **Firebase configuré** : La `FIREBASE_SERVER_KEY` doit être configurée dans les variables d'environnement
3. **Token enregistré** : Chaque appareil doit avoir son token enregistré dans `device_tokens`
4. **App fermée** : Les notifications fonctionnent même si l'app est complètement fermée (grâce à FCM)

---

## 📝 Notes Techniques

- **FCM (Firebase Cloud Messaging)** : Service utilisé pour envoyer les notifications push natives
- **Capacitor Push Notifications** : Plugin qui gère les notifications dans l'app mobile
- **Notifications en arrière-plan** : Fonctionnent grâce à FCM qui communique directement avec iOS/Android
- **Notifications en premier plan** : Sont gérées par l'app elle-même via les listeners Capacitor

