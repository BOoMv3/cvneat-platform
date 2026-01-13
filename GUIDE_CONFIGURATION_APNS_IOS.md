# 🔔 Guide : Configuration APNs (Apple Push Notification service) pour iOS

## 📋 Prérequis

- ✅ Compte Apple Developer payant (99€/an)
- ✅ App ID configuré : `fr.cvneat.app`
- ✅ Push Notifications activées dans l'App ID

## 🚀 Étapes de Configuration

### Étape 1 : Créer une Clé APNs dans Apple Developer

1. **Aller sur** https://developer.apple.com/account/resources/authkeys/list
2. **Cliquer sur** le bouton "+" pour créer une nouvelle clé
3. **Nommer la clé** : `CVN'EAT Push Notifications` (ou autre nom)
4. **Cocher** "Apple Push Notifications service (APNs)"
5. **Cliquer sur** "Continue"
6. **Configuration de l'environnement** :
   - **Choisir** : **"Production"** (ou les deux si disponible)
   - ⚠️ **Important** : Si vous choisissez "Production", cela fonctionnera aussi pour le développement
   - Si vous avez le choix entre "Development" et "Production", choisissez **"Production"** (ou les deux)
7. **Configuration des restrictions de clé** :
   - **Option recommandée** : **"No restriction"** (Aucune restriction)
   - Cela permet d'utiliser la clé pour tous vos App IDs
   - Si vous voulez restreindre, vous pouvez sélectionner uniquement `fr.cvneat.app`
8. **Cliquer sur** "Continue" puis "Register"
9. **⚠️ IMPORTANT** : Télécharger le fichier `.p8` (vous ne pourrez le télécharger qu'une seule fois !)
10. **Noter** :
   - Le **Key ID** (ex: `ABC123XYZ`)
   - L'**équipe ID** (ex: `DEF456UVW`) - visible en haut à droite de la page

### Étape 2 : Configurer APNs dans le Code (Alternative)

**⚠️ IMPORTANT** : Supabase ne propose pas d'interface native pour configurer APNs dans le dashboard. Nous allons utiliser l'API Supabase directement avec les credentials APNs.

**Option A : Utiliser l'API Supabase avec les credentials APNs**

1. **Ouvrir le fichier** `.env.local` (ou les variables d'environnement dans Vercel)
2. **Ajouter** ces variables :
   ```env
   # APNs Configuration (depuis Apple Developer)
   APNS_KEY_ID=votre_key_id_ici
   APNS_TEAM_ID=votre_team_id_ici
   APNS_BUNDLE_ID=fr.cvneat.app
   APNS_KEY_CONTENT=contenu_du_fichier_p8_ici
   ```

3. **Pour obtenir le contenu du fichier `.p8`** :
   - Ouvrir le fichier `.p8` téléchargé dans un éditeur de texte
   - Copier TOUT le contenu (y compris `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`)
   - Coller dans `APNS_KEY_CONTENT`

**Option B : Utiliser une Edge Function Supabase (Recommandé pour production)**

Voir `GUIDE_APNS_EDGE_FUNCTION.md` pour une solution plus robuste.

### Étape 3 : Vérifier la Configuration dans Xcode

1. **Ouvrir** le projet iOS dans Xcode : `npx cap open ios`
2. **Sélectionner** le projet "App" dans le navigateur
3. **Aller dans** "Signing & Capabilities"
4. **Vérifier** que "Push Notifications" est dans la liste des capabilities
5. **Si absent** : Cliquer sur "+ Capability" et ajouter "Push Notifications"

### Étape 4 : Tester les Notifications

1. **Builder l'app** : `npm run build:mobile` puis `npx cap sync`
2. **Installer sur un iPhone physique** (les notifications ne fonctionnent pas sur simulateur)
3. **Ouvrir l'app** et se connecter
4. **Vérifier dans les logs** que le token push est enregistré
5. **Tester une notification** :
   - Fermer l'app complètement
   - Créer une commande depuis le site web
   - Vérifier que la notification apparaît sur l'iPhone

## 🔍 Vérification

### Vérifier que le token est enregistré

Dans Supabase, exécuter cette requête SQL :

```sql
SELECT * FROM device_tokens 
WHERE platform = 'ios' 
ORDER BY created_at DESC 
LIMIT 10;
```

Vous devriez voir les tokens iOS enregistrés.

### Tester l'envoi de notification

Depuis le dashboard Supabase → SQL Editor :

```sql
-- Récupérer un token iOS
SELECT token FROM device_tokens WHERE platform = 'ios' LIMIT 1;

-- Envoyer une notification test (remplacer TOKEN par le token ci-dessus)
-- Note: Cette requête nécessite l'API Supabase, pas directement via SQL
```

## ⚠️ Points Importants

1. **Les notifications ne fonctionnent PAS sur simulateur iOS** - Il faut un iPhone physique
2. **Le fichier `.p8` ne peut être téléchargé qu'une seule fois** - Gardez-le en sécurité
3. **Les notifications en background nécessitent** que l'app soit au moins lancée une fois
4. **Pour les notifications hors app**, l'app doit avoir été lancée au moins une fois après installation

## 🐛 Dépannage

### Les notifications ne fonctionnent pas

1. **Vérifier** que Push Notifications est activé dans Xcode
2. **Vérifier** que l'app est installée sur un iPhone physique (pas simulateur)
3. **Vérifier** que les permissions sont accordées (Settings → CVN'EAT → Notifications)
4. **Vérifier** dans les logs Xcode que le token est bien enregistré
5. **Vérifier** dans Supabase que le token est bien dans `device_tokens`

### Erreur "Invalid APNs credentials"

1. **Vérifier** que la clé APNs est bien configurée dans Supabase
2. **Vérifier** que le Key ID et Team ID sont corrects
3. **Vérifier** que le Bundle ID correspond (`fr.cvneat.app`)

