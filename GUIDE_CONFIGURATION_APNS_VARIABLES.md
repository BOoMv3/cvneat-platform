# 🔑 Guide : Configurer les Variables d'Environnement APNs

## 📋 Informations Nécessaires

Vous avez besoin de :
1. ✅ **Key ID** : Noté lors de la création de la clé APNs
2. ✅ **Team ID** : Visible en haut à droite de Apple Developer
3. ✅ **Fichier `.p8`** : Téléchargé lors de la création de la clé

## 🔧 Configuration Locale (`.env.local`)

**Créer ou modifier** le fichier `.env.local` à la racine du projet :

```env
# APNs Configuration (Apple Push Notification service)
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_BUNDLE_ID=fr.cvneat.app
APNS_KEY_CONTENT=-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
(le contenu complet du fichier .p8)
...
-----END PRIVATE KEY-----
```

## 📝 Comment Obtenir le Contenu du Fichier `.p8`

1. **Ouvrir le fichier `.p8`** dans un éditeur de texte (TextEdit, VS Code, etc.)
2. **Sélectionner TOUT le contenu** (Cmd+A)
3. **Copier** (Cmd+C)
4. **Coller** dans `APNS_KEY_CONTENT` en gardant les retours à la ligne

**⚠️ IMPORTANT** :
- Garder les lignes `-----BEGIN PRIVATE KEY-----` et `-----END PRIVATE KEY-----`
- Garder tous les retours à la ligne
- Ne pas modifier le contenu

## 🌐 Configuration Production (Vercel)

1. **Aller sur** https://vercel.com/dashboard
2. **Sélectionner votre projet** CVN'EAT
3. **Aller dans** Settings → Environment Variables
4. **Ajouter** ces 4 variables :
   - `APNS_KEY_ID` = votre Key ID
   - `APNS_TEAM_ID` = votre Team ID
   - `APNS_BUNDLE_ID` = `fr.cvneat.app`
   - `APNS_KEY_CONTENT` = le contenu complet du fichier `.p8`

## ✅ Vérification

Après avoir configuré les variables, redémarrer le serveur :

```bash
npm run dev
```

Vous devriez voir dans les logs :
```
✅ Provider APNs créé avec succès
```

Si vous voyez des erreurs, vérifiez que :
- ✅ Toutes les variables sont définies
- ✅ Le contenu du fichier `.p8` est correct (avec les lignes BEGIN/END)
- ✅ Pas d'espaces supplémentaires au début/fin

## 🔍 Trouver le Team ID

1. **Aller sur** https://developer.apple.com/account
2. **Regarder en haut à droite** de la page
3. **Vous verrez** : "Team ID: DEF456UVW" (10 caractères)

## 🔍 Trouver le Key ID

1. **Aller sur** https://developer.apple.com/account/resources/authkeys/list
2. **Trouver votre clé** "CVN'EAT Push Notifications"
3. **Le Key ID** est affiché à côté du nom (ex: `ABC123XYZ`)

