# 🔑 Guide Détaillé : Création Clé APNs - Configuration Étape par Étape

## 📋 Étape 1 : Accéder à la Page des Clés

1. **Aller sur** https://developer.apple.com/account/resources/authkeys/list
2. **Se connecter** avec votre Apple ID (celui avec le compte Developer payant)
3. **Cliquer sur** le bouton **"+"** (en haut à gauche) pour créer une nouvelle clé

## 📝 Étape 2 : Nommer la Clé

1. **Dans le champ "Key Name"**, entrer : `CVN'EAT Push Notifications`
   - Vous pouvez mettre n'importe quel nom, c'est juste pour vous repérer

## ✅ Étape 3 : Sélectionner APNs

1. **Cocher la case** : **"Apple Push Notifications service (APNs)"**
2. **⚠️ IMPORTANT** : Ne cocher QUE cette case pour l'instant
3. **Cliquer sur** **"Configure"** (à côté de la case cochée)

## ⚙️ Étape 4 : Configuration de l'Environnement

Vous allez voir deux options :

### Option A : Si vous voyez "Environment" (Environnement)

**Choisir** : **"Production"**

**Pourquoi Production ?**
- ✅ Production fonctionne pour les apps en production ET en développement
- ✅ C'est la solution la plus simple
- ✅ Vous n'aurez pas besoin de créer deux clés différentes

**Si vous avez le choix entre :**
- **Development** : Uniquement pour les tests (simulateur, TestFlight)
- **Production** : Pour la production ET le développement ✅ **CHOISIR CELUI-CI**

### Option B : Si vous voyez "Key Restriction" (Restriction de Clé)

**Choisir** : **"No restriction"** (Aucune restriction)

**Pourquoi No restriction ?**
- ✅ Plus simple à configurer
- ✅ Fonctionne pour tous vos App IDs
- ✅ Vous pourrez toujours restreindre plus tard si besoin

**Si vous voulez restreindre** (optionnel) :
- Sélectionner **"Restrict to specific App IDs"**
- Cocher uniquement : **`fr.cvneat.app`**

## 🔄 Étape 5 : Finaliser

1. **Cliquer sur** **"Save"** (ou "Enregistrer")
2. **Cliquer sur** **"Continue"**
3. **Vérifier** les informations affichées
4. **Cliquer sur** **"Register"** (ou "Enregistrer")

## ⬇️ Étape 6 : Télécharger la Clé

1. **⚠️ CRITIQUE** : Vous verrez un écran avec un bouton **"Download"** (Télécharger)
2. **Cliquer sur** **"Download"** immédiatement
3. **Sauvegarder** le fichier `.p8` dans un endroit sûr
4. **⚠️ ATTENTION** : Vous ne pourrez télécharger ce fichier qu'UNE SEULE FOIS !
5. **Noter** :
   - Le **Key ID** (ex: `ABC123XYZ`) - affiché sur la page
   - L'**équipe ID** (ex: `DEF456UVW`) - visible en haut à droite de la page Apple Developer

## 📸 Exemple de ce que vous devriez voir

```
Key Name: CVN'EAT Push Notifications
Key ID: ABC123XYZ
Team ID: DEF456UVW
Environment: Production
Restriction: No restriction
```

## ✅ Vérification

Après avoir créé la clé, vous devriez voir :
- ✅ La clé dans la liste avec le nom "CVN'EAT Push Notifications"
- ✅ Le Key ID affiché
- ✅ Le fichier `.p8` téléchargé sur votre ordinateur

## 🐛 Problèmes Courants

### "Je ne vois pas l'option Environment"
- C'est normal, certaines interfaces Apple ne montrent pas cette option
- Continuez avec "No restriction" et ça fonctionnera quand même

### "Je ne peux pas cocher APNs"
- Vérifiez que vous êtes bien connecté avec un compte Apple Developer payant
- Vérifiez que votre compte est actif (99€/an payé)

### "Je ne trouve pas mon Team ID"
- Il est visible en haut à droite de la page Apple Developer
- Format : 10 caractères (lettres et chiffres)

## 🎯 Prochaine Étape

Une fois la clé créée et téléchargée, passez à l'**Étape 2** du guide `GUIDE_CONFIGURATION_APNS_IOS.md` pour configurer APNs dans Supabase.

