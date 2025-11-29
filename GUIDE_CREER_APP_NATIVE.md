# 📱 Guide : Créer une vraie application Android native

Ce guide vous explique comment créer une **vraie application Android** (APK) que vous pouvez installer directement sur votre téléphone, **sans passer par le navigateur**.

## 🎯 Objectif

Créer un fichier **APK** que vous pouvez :
- Installer directement sur votre téléphone Android
- Partager avec d'autres personnes
- Publier sur le Play Store (plus tard)

## 📋 Prérequis

1. ✅ Android Studio installé
2. ✅ Téléphone Android connecté (ou émulateur)
3. ✅ Projet Capacitor configuré (déjà fait ✅)

## 🚀 Étapes pour créer l'APK

### Étape 1 : Builder l'application

Dans votre terminal, exécutez :

```bash
npm run build:mobile
```

Ce script va :
1. Builder Next.js en fichiers statiques
2. Synchroniser avec Capacitor
3. Copier les fichiers dans le projet Android

**⏱️ Durée :** 2-5 minutes

### Étape 2 : Ouvrir Android Studio

```bash
npm run capacitor:open:android
```

Ou ouvrez Android Studio manuellement et ouvrez le dossier `android/`.

**⏱️ Attendre :** Android Studio va synchroniser Gradle (première fois : 5-10 minutes)

### Étape 3 : Générer l'APK

#### Option A : APK Debug (pour tester rapidement)

1. Dans Android Studio, allez dans le menu : **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Attendez la fin du build (1-2 minutes)
3. Un message apparaîtra : **"APK(s) generated successfully"**
4. Cliquez sur **"locate"** pour ouvrir le dossier

**📍 Emplacement de l'APK :**
```
android/app/build/outputs/apk/debug/app-debug.apk
```

#### Option B : APK Release (pour production)

1. **Build** → **Generate Signed Bundle / APK**
2. Sélectionnez **APK** (pas Bundle)
3. Si c'est la première fois :
   - Cliquez sur **"Create new..."** pour créer une clé de signature
   - Remplissez le formulaire (gardez le mot de passe en sécurité !)
   - Choisissez un nom pour le fichier de clé (ex: `cvneat-key.jks`)
4. Sélectionnez **release** comme build variant
5. Cliquez sur **Finish**
6. L'APK sera dans : `android/app/build/outputs/apk/release/app-release.apk`

### Étape 4 : Installer l'APK sur votre téléphone

#### Méthode 1 : Via USB (le plus simple)

1. Transférez l'APK sur votre téléphone (USB, email, cloud, etc.)
2. Sur votre téléphone, ouvrez le fichier APK
3. Si un message apparaît : **"Installer depuis des sources inconnues"**
   - Allez dans **Paramètres** → **Sécurité** → Activez **"Sources inconnues"**
4. Cliquez sur **Installer**
5. Une fois installé, l'app apparaîtra dans vos applications !

#### Méthode 2 : Via Android Studio (direct)

1. Connectez votre téléphone en USB
2. Activez le **mode développeur** et **débogage USB** sur votre téléphone
3. Dans Android Studio, sélectionnez votre téléphone dans la liste des appareils
4. Cliquez sur **Run** (▶️) ou `Shift + F10`
5. L'app s'installera automatiquement !

## 🔄 Mettre à jour l'app

Chaque fois que vous modifiez le code :

1. **Rebuilder :**
   ```bash
   npm run build:mobile
   ```

2. **Dans Android Studio :**
   - **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
   - Ou cliquez sur **Run** (▶️) pour installer directement

## 📦 Différences : App native vs Navigateur

| Navigateur | App Native (APK) |
|------------|------------------|
| Ouvre dans Chrome/Firefox | Application séparée |
| Icône dans les favoris | Icône dans le menu apps |
| Charge depuis internet | Fichiers locaux (plus rapide) |
| Peut être fermée par erreur | Reste ouverte comme une vraie app |
| Pas de notifications push | Notifications push possibles |
| Pas d'accès aux fonctionnalités du téléphone | Accès caméra, GPS, etc. |

## ⚙️ Configuration importante

### Les API fonctionnent automatiquement

L'app utilise un **intercepteur automatique** qui redirige tous les appels API vers `https://cvneat.fr/api`. **Aucune modification nécessaire !**

### Changer l'URL de l'API

Si vous voulez pointer vers un autre serveur, modifiez `lib/api-config.js` :

```javascript
return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr';
```

## 🐛 Résolution de problèmes

### "Gradle sync failed"
- Vérifiez votre connexion internet
- Dans Android Studio : **File** → **Invalidate Caches / Restart**

### "APK not installing"
- Vérifiez que **"Sources inconnues"** est activé
- Vérifiez que l'APK n'est pas corrompu (rebuilder)

### "App crashes on launch"
- Vérifiez les logs dans Android Studio : **Logcat**
- Vérifiez que `npm run build:mobile` s'est bien terminé

### "Cannot find device"
- Vérifiez que le débogage USB est activé
- Essayez de débrancher/rebrancher le câble USB
- Redémarrez ADB : `adb kill-server && adb start-server`

## 🎉 C'est tout !

Vous avez maintenant une **vraie application Android** qui fonctionne indépendamment du navigateur !

## 📝 Prochaines étapes (optionnel)

- **Publier sur le Play Store** : Créez un compte développeur Google Play (25$ une fois)
- **Ajouter des icônes personnalisées** : Modifiez les fichiers dans `android/app/src/main/res/`
- **Configurer les notifications push** : Utilisez Firebase Cloud Messaging

