# Installation de l'app Android CVN'EAT (sans Mac)

Ce guide explique comment **construire un APK** et **l'installer sur ton téléphone Android** pour utiliser l'app **sans être branché au Mac**.

---

## Vue d'ensemble

Quand tu lances l'app depuis Android Studio via USB, tu utilises une **version debug**. Pour avoir une app qui tourne **seule** (même sans Mac) :

1. Tu construis un **APK** (fichier d’installation Android)
2. Tu copies l’APK sur ton téléphone
3. Tu installes l’APK sur le téléphone
4. L’app fonctionne en mode standalone (connexion internet pour les API)

---

## Prérequis

- **Android Studio** installé (ou au moins le JDK et Android SDK)
- **Node.js** (v18+)
- Les fichiers **`google-services.json`** et **`android/app/`** à jour (Firebase configuré)

---

## Étape 1 – Build de l’app

Sur ton Mac, dans un terminal :

```bash
cd /Users/boomv3/Desktop/cvneat-platform

# 1. Synchroniser le logo Android avec iOS (si besoin)
npm run sync:android-icon

# 2. Build Next.js + sync Capacitor
npm run build:android

# 3. Générer l’APK debug
npm run apk:debug
```

Le script `apk:debug` lance `cd android && ./gradlew assembleDebug`.  
L’APK est généré dans :

```
android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Étape 2 – Copier l’APK sur ton téléphone

### Option A – USB

1. Branche ton téléphone au Mac en USB  
2. Monte le téléphone comme disque (si demandé)  
3. Copie `app-debug.apk` sur le téléphone (par exemple dans Téléchargements)  
4. Débranche le téléphone  

### Option B – Google Drive / email

1. Copie `app-debug.apk` dans Google Drive ou envoie-le par email  
2. Sur ton téléphone, ouvre Drive (ou l’email) et télécharge le fichier  

### Option C – ADB (si configuré)

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

---

## Étape 3 – Installer l’APK sur le téléphone

1. Sur l’Android, ouvre **Fichiers** (ou l’app où tu as enregistré l’APK)  
2. Repère **`app-debug.apk`**  
3. Clique dessus  
4. Si Android demande : **« Autoriser l’installation à partir de cette source »**, active l’option pour l’app (Fichiers, Drive, etc.)  
5. Suis les étapes d’installation et valide  

L’icône **CVN'EAT** apparaît sur l’écran d’accueil. Tu peux lancer l’app comme toute autre application, **sans être branché au Mac**.

---

## Rappels

- **Connexion internet** : l’app utilise `https://cvneat.fr/api` pour les données et les notifications push  
- **Notifications** : elles fonctionnent si tu t’es connecté, si tu as autorisé les notifications et si ton token est enregistré côté serveur  
- **Debug vs Release** : `app-debug.apk` est signé avec la clé de debug. C’est suffisant pour usage perso / tests. Pour une distribution publique, il faut un APK **release** signé avec ta propre clé  

---

## Commande récap

```bash
cd /Users/boomv3/Desktop/cvneat-platform
npm run build:android && npm run apk:debug
```

Ensuite : copier `android/app/build/outputs/apk/debug/app-debug.apk` sur le téléphone et l’installer.

---

*Dernière mise à jour : février 2025.*
