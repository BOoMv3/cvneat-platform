# Guide Android – Notifications push (CVN'EAT)

Ce guide explique étape par étape comment configurer l’application Android CVN'EAT avec les notifications push. Aucune connaissance préalable n’est nécessaire.

---

## Vue d’ensemble

L’app Android utilise :
- **Capacitor** pour le packaging
- **Firebase Cloud Messaging (FCM)** pour les push sur Android
- **Supabase** pour le stockage des tokens
- **API Next.js** pour l’envoi des notifications

Les étapes principales :
1. Créer/configurer Firebase
2. Récupérer et placer `google-services.json`
3. Configurer la clé FCM côté serveur
4. Vérifier Supabase (table `device_tokens`)
5. Build de l’app et tests sur appareil réel

---

## Prérequis

- Node.js installé (v18+ recommandé)
- **Android Studio** installé
- Compte **Google** (pour Firebase)
- Projet **Supabase** CVN'EAT déjà configuré
- Variables d’environnement Supabase déjà définies

---

## Étape 1 – Firebase Console

### 1.1 Créer ou ouvrir un projet Firebase

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Se connecter avec votre compte Google
3. **Créer un projet** ou sélectionner un projet existant
4. Si création : choisir un nom (ex. `cvneat`) et suivre l’assistant

### 1.2 Activer Cloud Messaging

1. Dans le menu de gauche : **Build** → **Cloud Messaging**
2. Si demandé, accepter les conditions d’utilisation
3. Noter l’interface : elle servira plus tard pour les tests

### 1.3 Ajouter l’application Android

1. Sur la page d’accueil du projet : cliquer sur l’icône **Android**
2. Renseigner :
   - **Package Android** : `fr.cvneat.app` (obligatoire, identique à `capacitor.config.ts`)
   - **Alias** : `CVNEAT` (optionnel)
   - **Certificat SHA-1** : optionnel pour les notifications (utile pour d’autres fonctionnalités)
3. Cliquer sur **Register app**

### 1.4 Télécharger `google-services.json`

1. Cliquer sur **Download google-services.json**
2. Le fichier sera téléchargé dans vos Téléchargements

### 1.5 Placer le fichier dans le projet

1. Copier `google-services.json` vers :
   ```
   /Users/boomv3/Desktop/cvneat-platform/android/app/google-services.json
   ```
2. Structure attendue :
   ```
   android/
     app/
       google-services.json   ← ici
       build.gradle
       src/
         main/
   ```

> Ne jamais commiter `google-services.json` si le projet est public. Ajouter `android/app/google-services.json` au `.gitignore` si besoin.

---

## Étape 2 – Envoi des push depuis le serveur (FCM HTTP v1, recommandé)

Le backend utilise **FCM HTTP v1** (API moderne, déjà activée sur ton projet). Il faut un **compte de service** Firebase, pas l’ancienne Server key.

### 2.1 Créer / télécharger la clé du compte de service

1. Firebase Console → projet **cvneat** → **Paramètres du projet** (roue dentée)
2. Onglet **Comptes de service** (ou **Service accounts**)
3. En bas de page : **Générer une nouvelle clé privée** / **Generate new private key** → confirmer
4. Un fichier JSON est téléchargé (ex. `cvneat-xxxxx-firebase-adminsdk-xxxxx.json`). **Ne le partage pas et ne le commite pas.**

### 2.2 Configurer les variables d’environnement

Ouvre le JSON téléchargé. Tu y verras notamment : `project_id`, `client_email`, `private_key`.

**Option A – Trois variables (recommandé pour Vercel)**  
Dans `.env.local` (et dans Vercel → Settings → Environment Variables), ajoute :

```env
FIREBASE_PROJECT_ID=ton_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ton-projet.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

- `FIREBASE_PROJECT_ID` : la valeur de `project_id` dans le JSON
- `FIREBASE_CLIENT_EMAIL` : la valeur de `client_email`
- `FIREBASE_PRIVATE_KEY` : la valeur de `private_key` **telle quelle** (avec les `\n` dans la clé). Sur Vercel, colle la clé entre guillemets ; les retours à la ligne peuvent rester en `\n`.

**Option B – Un seul JSON (alternative)**  
Tu peux aussi mettre tout le contenu du fichier JSON dans une seule variable :

```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"cvneat-xxx",...}
```

(Utile si tu préfères une seule variable ; le JSON doit être sur une ligne ou correctement échappé.)

### 2.3 Vercel

1. [Vercel](https://vercel.com/) → projet CVN'EAT → **Settings** → **Environment Variables**
2. Ajouter `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ou `FIREBASE_SERVICE_ACCOUNT_JSON`) avec les valeurs ci-dessus
3. Redéployer si besoin

### 2.4 Ancienne méthode (Server key Legacy, optionnelle)

Si tu ne peux pas utiliser le compte de service, le backend accepte encore l’ancienne **Server key** (API Legacy). Dans Firebase → Paramètres → Cloud Messaging, si « API Cloud Messaging (ancienne version) » est activée et affiche une **Server key**, tu peux la mettre dans `.env.local` et Vercel :

```env
FIREBASE_SERVER_KEY=AAAAxxxxxxx:votre_cle_legacy
```

Le backend utilise **d’abord FCM v1** (compte de service) ; s’il n’est pas configuré, il bascule sur la Server key

---

## Étape 3 – Supabase (table `device_tokens`)

### 3.1 Vérifier que la migration est appliquée

La migration `create-device-tokens-table.sql` crée la table et les politiques RLS. Si elle n’a pas encore été exécutée :

1. Aller dans **Supabase Dashboard** → **SQL Editor**
2. Créer une requête avec le contenu suivant (identique au fichier de migration) :

```sql
-- Table pour stocker les tokens de notification push (FCM)
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
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all tokens" ON device_tokens
  FOR ALL
  USING (auth.role() = 'service_role');
```

3. Exécuter la requête

### 3.2 Vérifier les colonnes

Dans **Table Editor** → **device_tokens**, vérifier que les colonnes sont présentes :
- `id` (uuid)
- `token` (text, unique)
- `user_id` (uuid, FK auth.users)
- `platform` (text : android, ios, web)
- `created_at`, `updated_at` (timestamptz)

---

## Étape 4 – Build de l’application Android

### 4.1 Depuis le terminal

Dans le dossier du projet :

```bash
cd /Users/boomv3/Desktop/cvneat-platform

# Installer les dépendances si nécessaire
npm install

# Build Next.js + sync Capacitor (Android uniquement)
npm run build:android
```

Ce script :
1. Build Next.js en export statique
2. Nettoie les artefacts de dev
3. Crée les fichiers HTML pour les routes dynamiques
4. Exécute `npx cap sync android`

### 4.2 En cas d’erreur

- **`out` n’existe pas** : le build Next.js a échoué. Vérifier les logs et lancer `npm run build` seul.
- **`google-services.json not found`** : vérifier que le fichier est bien dans `android/app/google-services.json`.
- **Erreur Gradle** : ouvrir le projet dans Android Studio et « Sync Project with Gradle Files ».

---

## Étape 5 – Ouvrir et lancer dans Android Studio

### 5.1 Ouvrir le projet

```bash
cd /Users/boomv3/Desktop/cvneat-platform
npx cap open android
```

Android Studio s’ouvre avec le projet `android`.

### 5.2 Synchroniser Gradle

1. Si Android Studio propose « Sync Now », cliquer dessus
2. Sinon : **File** → **Sync Project with Gradle Files**
3. Attendre la fin de la synchronisation

### 5.3 Configurer un appareil

**Option A – Appareil physique (recommandé pour les push)**

1. Activer le **mode développeur** sur le téléphone
2. Activer le **débogage USB**
3. Connecter le téléphone en USB
4. Dans Android Studio, choisir l’appareil dans la liste déroulante des appareils

**Option B – Émulateur**

1. **Tools** → **Device Manager**
2. Créer un nouvel appareil virtuel
3. Choisir une image avec **Google Play** (nécessaire pour FCM)

### 5.4 Lancer l’application

1. Cliquer sur le bouton vert **Run** (ou `Shift+F10`)
2. Sélectionner l’appareil
3. Attendre le déploiement et le lancement

---

## Étape 6 – Tester les notifications push

### 6.1 Connexion et autorisation

1. Ouvrir l’app sur l’appareil
2. Se connecter avec un compte existant (client, livreur ou restaurant)
3. Lors de la première ouverture, accepter les **autorisations de notifications**
4. Rester sur l’écran de l’app quelques secondes pour que le token soit enregistré

### 6.2 Vérifier l’enregistrement du token

**Dans Supabase :**

1. **Table Editor** → **device_tokens**
2. Une nouvelle ligne devrait apparaître avec :
   - `platform` = `android`
   - `user_id` = votre utilisateur
   - `token` = une longue chaîne FCM

**En cas de log (via Chrome remote debugging) :**

1. Connecter le téléphone en USB
2. Ouvrir Chrome sur PC : `chrome://inspect`
3. Sélectionner l’appareil et l’onglet WebView de l’app
4. Inspecter la console : messages comme « Token enregistré dans Supabase » ou « Token enregistré via API »

### 6.3 Envoyer une notification de test

**Via l’API :**

```bash
curl -X POST https://cvneat.fr/api/notifications/send-push \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test CVN'\''EAT",
    "body": "Votre notification push fonctionne !",
    "userId": "VOTRE_USER_ID_ICI"
  }'
```

Remplacer `VOTRE_USER_ID_ICI` par l’UUID de votre utilisateur (visible dans Supabase → auth.users ou device_tokens).

**Par rôle (livreurs, restaurants) :**

```bash
curl -X POST https://cvneat.fr/api/notifications/send-push \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nouvelle commande",
    "body": "Une commande est disponible.",
    "role": "delivery"
  }'
```

---

## Récapitulatif des commandes

| Action                     | Commande                    |
|----------------------------|-----------------------------|
| Build Android              | `npm run build:android`     |
| Ouvrir Android Studio      | `npx cap open android`      |
| Sync Capacitor             | `npx cap sync android`      |

---

## Fichiers importants

| Fichier / chemin                                      | Rôle                                              |
|------------------------------------------------------|---------------------------------------------------|
| `capacitor.config.ts`                                | `appId`, `webDir`, config Capacitor               |
| `android/app/google-services.json`                   | Config Firebase Android (à placer ici)            |
| `android/app/build.gradle`                           | Intègre le plugin Google Services                 |
| `.env.local`                                         | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ou `FIREBASE_SERVER_KEY` legacy) |
| `lib/capacitor-push-notifications.js`                | Init push, enregistrement token Supabase/API      |
| `app/api/notifications/register-device/route.js`     | API d’enregistrement des tokens                   |
| `app/api/notifications/send-push/route.js`           | API d’envoi des push (FCM + APNs)                 |

---

## Dépannage

### Pas de token dans `device_tokens`

- Vérifier que l’utilisateur est bien connecté
- Vérifier que les notifications sont autorisées dans les paramètres Android
- Regarder les logs (Chrome inspect ou Logcat Android Studio)
- S’assurer que l’app appelle l’API ou Supabase (URL correcte, pas de blocage CORS)

### La notification ne s’affiche pas

- Vérifier que FCM est configuré : soit compte de service (FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY), soit FIREBASE_SERVER_KEY (legacy), en local et sur Vercel
- Vérifier que le token est bien en base avec `platform = 'android'`
- Tester avec une requête curl directe vers `/api/notifications/send-push`
- Vérifier les logs serveur Vercel

### Erreur « google-services.json not found »

- Le fichier doit être dans `android/app/google-services.json`
- Vérifier le nom exact du fichier
- Relancer `npm run build:android` puis `npx cap open android`

### L’app affiche une page blanche

- Vérifier que le build Next.js a bien généré le dossier `out`
- Vérifier que `npx cap sync android` a bien été exécuté
- En cas de routes API appelées, s’assurer que l’URL de base pointe vers `https://cvneat.fr` (et non vers un domaine local)

---

*Dernière mise à jour : janvier 2025.*
