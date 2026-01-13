# 🍎 Commandes Xcode pour l'Application iOS

## 📱 Commandes Rapides

### 1. Ouvrir le projet dans Xcode
```bash
cd /Users/boomv3/Desktop/cvneat-platform
npx cap open ios
```

**OU** manuellement :
```bash
open ios/App/App.xcworkspace
```

---

## 🔧 Commandes Utiles

### 2. Synchroniser les fichiers web avec Capacitor
```bash
npx cap sync ios
```

### 3. Nettoyer le build Xcode
Dans Xcode : **Product** → **Clean Build Folder** (`Shift + Cmd + K`)

### 4. Compiler et lancer l'app
Dans Xcode : Cliquez sur le bouton **▶️ Play** ou appuyez sur `Cmd + R`

### 5. Sélectionner un simulateur ou un appareil
Dans Xcode : En haut à côté du bouton Play, sélectionnez votre iPhone/simulateur

---

## 🚀 Workflow Complet

### Étape 1 : Synchroniser (si vous avez modifié le code)
```bash
cd /Users/boomv3/Desktop/cvneat-platform
npx cap sync ios
```

### Étape 2 : Ouvrir Xcode
```bash
npx cap open ios
```

### Étape 3 : Dans Xcode
1. **Product** → **Clean Build Folder** (`Shift + Cmd + K`)
2. Sélectionnez votre appareil/simulateur
3. Cliquez sur **▶️ Play** (`Cmd + R`)

---

## 📦 Commandes de Build (Terminal)

### Build complet depuis le terminal
```bash
cd /Users/boomv3/Desktop/cvneat-platform
npm run build:ios
```

### Build uniquement l'app mobile (sans ouvrir Xcode)
```bash
cd /Users/boomv3/Desktop/cvneat-platform
node scripts/build-mobile-smart.js
```

---

## 🔍 Vérifications

### Vérifier que les fichiers sont bien synchronisés
```bash
ls -la ios/App/App/public/
```

Vous devriez voir les fichiers HTML, JS, CSS de votre application.

### Vérifier le Bundle Identifier
Dans Xcode : **App** → **Signing & Capabilities** → Vérifiez que c'est `fr.cvneat.app`

---

## ⚠️ En cas de problème

### Réinstaller les dépendances iOS
```bash
cd ios/App
pod install
cd ../..
```

### Réinitialiser Capacitor
```bash
npx cap sync ios --force
```

---

## 📝 Notes

- **Première fois** : Xcode peut prendre quelques minutes pour indexer le projet
- **Simulateur** : Plus rapide pour tester, mais certaines fonctionnalités (push notifications, caméra) nécessitent un vrai appareil
- **Appareil réel** : Nécessite un compte Apple Developer (99€/an) et une configuration de certificat

