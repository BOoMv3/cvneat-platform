# 📝 Guide Détaillé : Configuration `.env.local` pour APNs

## 🎯 Objectif

Configurer les 4 variables nécessaires pour que l'application puisse envoyer des notifications push iOS via APNs (Apple Push Notification service).

## 📋 Étape par Étape

### Étape 1 : Créer ou Ouvrir le Fichier `.env.local`

1. **Ouvrir** votre éditeur de code (VS Code, etc.)
2. **Aller à la racine** du projet : `/Users/boomv3/Desktop/cvneat-platform`
3. **Chercher** le fichier `.env.local`
   - Si il **existe** : l'ouvrir
   - Si il **n'existe pas** : créer un nouveau fichier nommé `.env.local`

**⚠️ IMPORTANT** : Le fichier doit être à la **racine** du projet, au même niveau que `package.json`

### Étape 2 : Obtenir le Key ID

1. **Aller sur** https://developer.apple.com/account/resources/authkeys/list
2. **Se connecter** avec votre Apple ID (celui avec le compte Developer payant)
3. **Trouver** la clé que vous venez de créer : **"CVN'EAT Push Notifications"**
4. **Regarder** la colonne **"Key ID"** à côté du nom
   - Format : `ABC123XYZ` (10 caractères, lettres et chiffres)
5. **Copier** ce Key ID

**Exemple** :
```
Key Name: CVN'EAT Push Notifications
Key ID: ABC123XYZ  ← C'est celui-ci qu'il faut copier
```

### Étape 3 : Obtenir le Team ID

1. **Toujours sur** https://developer.apple.com/account
2. **Regarder en haut à droite** de la page
3. **Vous verrez** quelque chose comme :
   ```
   Team: Votre Nom (Personal Team)
   Team ID: DEF456UVW  ← C'est celui-ci qu'il faut copier
   ```
4. **Copier** ce Team ID (10 caractères)

**Alternative** : Le Team ID est aussi visible dans la page des clés, en haut à droite.

### Étape 4 : Obtenir le Contenu du Fichier `.p8`

1. **Trouver** le fichier `.p8` que vous avez téléchargé lors de la création de la clé APNs
   - Il devrait être dans votre dossier **Téléchargements**
   - Nom du fichier : quelque chose comme `AuthKey_ABC123XYZ.p8`

2. **Ouvrir** ce fichier avec un éditeur de texte :
   - **Sur Mac** : Clic droit → "Ouvrir avec" → "TextEdit" ou "VS Code"
   - **Ne PAS utiliser** Pages, Word, ou autre logiciel de traitement de texte

3. **Le fichier devrait ressembler à ça** :
   ```
   -----BEGIN PRIVATE KEY-----
   MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
   (plusieurs lignes de caractères)
   ...
   -----END PRIVATE KEY-----
   ```

4. **Sélectionner TOUT** le contenu :
   - **Sur Mac** : `Cmd + A` (sélectionner tout)
   - **Vérifier** que vous avez bien sélectionné :
     - La ligne `-----BEGIN PRIVATE KEY-----`
     - Toutes les lignes au milieu
     - La ligne `-----END PRIVATE KEY-----`

5. **Copier** : `Cmd + C`

### Étape 5 : Ajouter les Variables dans `.env.local`

**Ouvrir** le fichier `.env.local` et **ajouter** ces 4 lignes à la fin :

```env
# APNs Configuration (Apple Push Notification service)
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_BUNDLE_ID=fr.cvneat.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(plusieurs lignes)
...
-----END PRIVATE KEY-----
```

## 📝 Exemple Complet

Voici à quoi devrait ressembler votre fichier `.env.local` (avec des exemples) :

```env
# Variables Supabase (déjà existantes)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Variables Stripe (déjà existantes)
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx

# APNs Configuration (NOUVELLES - À AJOUTER)
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_BUNDLE_ID=fr.cvneat.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQgV2ViUHVzaCBub3Rp
ZmljYXRpb25zIGZvciBpUGhvbmUuIFRoaXMgaXMgYSB0ZXN0IGtleS4KLS0tLS1F
TkQgUFJJVkFURSBLRVktLS0tLQo=
-----END PRIVATE KEY-----
```

## ⚠️ Points CRITIQUES

### 1. Format de `APNS_KEY_CONTENT`

**✅ CORRECT** :
```env
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

**❌ INCORRECT** (sans les lignes BEGIN/END) :
```env
APNS_KEY_CONTENT=MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
```

**❌ INCORRECT** (avec des guillemets) :
```env
APNS_KEY_CONTENT="-----BEGIN PRIVATE KEY-----..."
```

### 2. Pas d'Espaces

**✅ CORRECT** :
```env
APNS_KEY_ID=ABC123XYZ
```

**❌ INCORRECT** (avec espaces) :
```env
APNS_KEY_ID = ABC123XYZ
APNS_KEY_ID= ABC123XYZ
APNS_KEY_ID =ABC123XYZ
```

### 3. Bundle ID Exact

**✅ CORRECT** :
```env
APNS_BUNDLE_ID=fr.cvneat.app
```

**❌ INCORRECT** :
```env
APNS_BUNDLE_ID=fr.cvneat.app.ios
APNS_BUNDLE_ID=com.cvneat.app
```

### 4. Retours à la Ligne dans `APNS_KEY_CONTENT`

Le contenu du fichier `.p8` doit **garder ses retours à la ligne**. 

**Si vous copiez-collez dans `.env.local`**, VS Code devrait automatiquement gérer les retours à la ligne. Si ça ne fonctionne pas, vous pouvez :

1. **Utiliser des `\n`** (mais c'est plus compliqué)
2. **Ou mettre tout sur une seule ligne** (mais ça ne fonctionnera pas toujours)

**Meilleure solution** : Copier-coller tel quel, VS Code gère automatiquement.

## 🧪 Vérification

Après avoir ajouté les variables :

1. **Sauvegarder** le fichier `.env.local` : `Cmd + S`
2. **Redémarrer** le serveur de développement :
   ```bash
   # Arrêter le serveur actuel (Ctrl + C)
   npm run dev
   ```
3. **Regarder les logs** au démarrage :
   - ✅ **Si vous voyez** : `✅ Provider APNs créé avec succès` → **C'est bon !**
   - ❌ **Si vous voyez** : `❌ Configuration APNs manquante` → **Vérifiez les variables**

## 🐛 Problèmes Courants

### "Configuration APNs manquante"

**Causes possibles** :
- Une variable n'est pas définie
- Il y a une faute de frappe dans le nom de la variable
- Le fichier `.env.local` n'est pas à la racine du projet

**Solution** :
- Vérifier que les 4 variables sont bien présentes
- Vérifier l'orthographe exacte : `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_KEY_CONTENT`

### "Invalid token" ou "Bad credentials"

**Causes possibles** :
- Le Key ID est incorrect
- Le Team ID est incorrect
- Le contenu du fichier `.p8` est incorrect (manque les lignes BEGIN/END)

**Solution** :
- Vérifier que vous avez copié le bon Key ID depuis Apple Developer
- Vérifier que vous avez copié le bon Team ID
- Vérifier que le contenu du `.p8` inclut bien `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`

### Le serveur ne redémarre pas

**Solution** :
- Arrêter complètement le serveur (`Ctrl + C`)
- Relancer : `npm run dev`

## 📸 Capture d'Écran Exemple

Voici à quoi devrait ressembler votre fichier `.env.local` dans VS Code :

```
📁 cvneat-platform
  📄 .env.local          ← Ce fichier
  📄 package.json
  📄 next.config.js
  ...
```

Et le contenu :

```
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...

# APNs Configuration
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_BUNDLE_ID=fr.cvneat.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
-----END PRIVATE KEY-----
```

## ✅ Checklist Finale

Avant de tester, vérifiez :

- [ ] Le fichier `.env.local` existe à la racine du projet
- [ ] `APNS_KEY_ID` est défini (10 caractères)
- [ ] `APNS_TEAM_ID` est défini (10 caractères)
- [ ] `APNS_BUNDLE_ID` = `fr.cvneat.app` (exactement)
- [ ] `APNS_KEY_CONTENT` contient le fichier `.p8` complet (avec BEGIN/END)
- [ ] Pas d'espaces autour du `=` dans les variables
- [ ] Le serveur a été redémarré après les modifications

Une fois tout ça fait, vous devriez voir `✅ Provider APNs créé avec succès` dans les logs !

