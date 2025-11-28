# 📱 Guide : Créer une vraie app mobile autonome

Votre application est maintenant configurée pour fonctionner comme une **vraie app mobile autonome** qui utilise les fichiers locaux au lieu de charger depuis un serveur web.

## 🔄 Changements effectués

1. **Capacitor** : Configuration modifiée pour utiliser les fichiers locaux (`webDir: 'out'`)
2. **Next.js** : Configuration pour exporter en statique (`output: 'export'`)
3. **API** : Les appels API pointent automatiquement vers `https://cvneat.fr/api` dans l'app mobile

## 🚀 Comment builder l'app

### Étape 1 : Builder l'application Next.js

```bash
npm run build
```

Cela va créer un dossier `out/` avec tous les fichiers statiques.

### Étape 2 : Builder et synchroniser avec Capacitor

```bash
npm run build:mobile
```

Ce script fait automatiquement :
1. Build Next.js en statique (`out/`)
2. Synchronise avec Capacitor (copie dans Android)
3. Vérifie que tout est correct

Ou manuellement :
```bash
npm run build
npx cap sync
```

### Étape 3 : Ouvrir dans Android Studio

```bash
npm run capacitor:open:android
```

Ou ouvrez Android Studio manuellement et ouvrez le dossier `android/`.

### Étape 4 : Builder et lancer l'app

Dans Android Studio :
1. Attendez que le build Gradle se termine
2. Sélectionnez votre appareil (téléphone ou émulateur)
3. Cliquez sur le bouton **Run** (▶️) ou appuyez sur `Shift + F10`

## 📦 Générer un APK pour installation

### Mode Debug (pour tester)

Dans Android Studio :
1. **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. L'APK sera dans `android/app/build/outputs/apk/debug/app-debug.apk`

### Mode Release (pour production)

1. **Build** → **Generate Signed Bundle / APK**
2. Suivez l'assistant pour créer une clé de signature (si première fois)
3. L'APK sera dans `android/app/build/outputs/apk/release/app-release.apk`

## ⚙️ Configuration des API

### Intercepteur automatique

L'app mobile utilise un **intercepteur automatique** qui :
- Détecte automatiquement qu'elle tourne dans Capacitor
- Redirige **tous** les appels `/api/...` vers `https://cvneat.fr/api/...`
- Fonctionne avec tous les appels `fetch()` existants sans modification du code

**Aucune modification de code nécessaire !** Tous vos appels API existants fonctionneront automatiquement.

### Changer l'URL de l'API

Pour changer l'URL de l'API, modifiez la variable d'environnement dans `.env.local` :
```bash
NEXT_PUBLIC_API_BASE_URL=https://votre-serveur.com
```

Ou modifiez directement `lib/fetch-interceptor.js` :
```javascript
const API_BASE_URL = 'https://votre-serveur.com';
```

## 🔍 Différences avec l'ancienne version

| Ancienne version | Nouvelle version (vraie app) |
|-----------------|------------------------------|
| Charge depuis `https://cvneat.fr` | Utilise les fichiers locaux |
| Nécessite internet pour afficher l'app | Fonctionne hors ligne (frontend) |
| Mises à jour instantanées | Nécessite de rebuilder l'app |

## ⚠️ Notes importantes

1. **Les API routes** : Elles ne sont pas incluses dans l'app. Tous les appels API pointent vers le serveur en production (`https://cvneat.fr/api`).

2. **Mises à jour** : Pour mettre à jour l'app, vous devez :
   - Modifier le code
   - Builder (`npm run build`)
   - Synchroniser (`npx cap sync`)
   - Rebuilder dans Android Studio
   - Publier une nouvelle version sur le Play Store

3. **Développement** : Pour tester en local, vous pouvez temporairement modifier `capacitor.config.ts` :
   ```typescript
   server: {
     url: 'http://votre-ip:3000',
     cleartext: true
   }
   ```

## 🐛 Dépannage

### L'app ne se charge pas
- Vérifiez que le dossier `out/` existe après le build
- Vérifiez que `npx cap sync` a bien copié les fichiers

### Les API ne fonctionnent pas
- Vérifiez votre connexion internet
- Vérifiez que `https://cvneat.fr/api` est accessible
- Vérifiez les logs dans Android Studio (Logcat)

### Erreurs de build
- Nettoyez le projet : `cd android && ./gradlew clean`
- Rebuild : `npm run build && npx cap sync`
