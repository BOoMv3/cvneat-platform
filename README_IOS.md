# 📱 Application iOS Native - CVN'EAT

## ✅ Configuration automatique terminée

L'application iOS native est maintenant configurée et prête à être utilisée !

## 🚀 Commandes rapides

```bash
# Build et synchroniser l'app iOS
npm run build:ios

# Ouvrir dans Xcode
npm run capacitor:open:ios

# Configuration complète (si nécessaire)
npm run setup:ios
```

## 📋 Prochaines étapes

### 1. Installer Xcode (si pas encore fait)
- Ouvrez l'App Store
- Recherchez "Xcode" et installez-le
- Ouvrez Xcode une fois pour accepter les licences

### 2. Ouvrir le projet dans Xcode
```bash
npm run capacitor:open:ios
```

### 3. Configurer le signing dans Xcode
- Sélectionnez le projet "App" dans Xcode
- Onglet "Signing & Capabilities"
- Cochez "Automatically manage signing"
- Sélectionnez votre Team (votre compte Apple)

### 4. Tester l'app
- Sélectionnez un simulateur iOS (ex: iPhone 15 Pro)
- Cliquez sur le bouton ▶️ Play (ou Cmd + R)

## 📚 Documentation complète

Consultez **GUIDE_APP_IOS_NATIVE.md** pour la documentation complète avec toutes les étapes détaillées.

## 🔧 Structure du projet

```
ios/
  App/
    App.xcworkspace  ← Ouvrir ce fichier dans Xcode (pas .xcodeproj)
    App/              ← Code source iOS
    Pods/             ← Dépendances CocoaPods
```

## ⚠️ Important

- Ouvrez toujours **App.xcworkspace** dans Xcode (pas App.xcodeproj)
- Après chaque modification du code web, lancez `npm run build:ios`
- Les API pointent automatiquement vers `https://cvneat.fr/api`




