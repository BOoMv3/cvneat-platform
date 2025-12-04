# 🚀 Guide Rapide - Configuration iOS

## ✅ Ce qui est déjà fait

- ✅ Structure iOS créée
- ✅ Build Next.js terminé (27 pages générées)
- ✅ Fichiers synchronisés avec Capacitor iOS
- ✅ Xcode installé et configuré

## 📋 Étapes restantes

### Étape 1 : Installer CocoaPods (2 minutes)

Ouvrez votre terminal et exécutez :

```bash
sudo gem install cocoapods
```

Vous devrez entrer votre mot de passe administrateur.

### Étape 2 : Installer les dépendances iOS (5-10 minutes)

Une fois CocoaPods installé, depuis la racine du projet :

```bash
cd ios/App
pod install
cd ../..
```

Ou utilisez le script automatique :

```bash
./scripts/install-pods.sh
```

### Étape 3 : Ouvrir dans Xcode

```bash
npm run capacitor:open:ios
```

### Étape 4 : Configurer le Signing dans Xcode

1. Dans Xcode, sélectionnez le projet **App** dans le panneau de gauche
2. Sélectionnez la cible **App** sous "TARGETS"
3. Allez dans l'onglet **"Signing & Capabilities"**
4. **Cochez "Automatically manage signing"**
5. Sélectionnez votre **Team** (votre compte Apple)
   - Si vous n'avez pas de team, cliquez sur "Add Account..." et connectez-vous

### Étape 5 : Tester l'application

1. **Sur le simulateur** (recommandé pour commencer) :
   - En haut de Xcode, sélectionnez un simulateur (ex: "iPhone 15 Pro")
   - Cliquez sur le bouton **▶️ Play** (ou `Cmd + R`)

2. **Sur votre iPhone** :
   - Connectez votre iPhone via USB
   - Sélectionnez-le dans la liste des appareils (en haut de Xcode)
   - Cliquez sur **▶️ Play**
   - Sur votre iPhone : **Settings** → **General** → **VPN & Device Management** → Faites confiance au développeur

## 🔧 Commandes utiles

```bash
# Vérifier si CocoaPods est installé
pod --version

# Builder et synchroniser l'app iOS
npm run build:ios

# Ouvrir Xcode
npm run capacitor:open:ios

# Installer les Pods (après CocoaPods installé)
cd ios/App && pod install && cd ../..
```

## ⚠️ Résolution de problèmes

### "CocoaPods non installé"
```bash
sudo gem install cocoapods
```

### "Command not found: pod"
Vérifiez que CocoaPods est installé :
```bash
which pod
```

### "No provisioning profiles found"
1. Dans Xcode : **Settings** → **Accounts**
2. Ajoutez votre Apple ID
3. Dans le projet, sélectionnez votre Team

### "Build failed"
```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
```

## 📚 Documentation complète

Consultez **GUIDE_APP_IOS_NATIVE.md** pour plus de détails.

## 🎉 Prêt à lancer !

Une fois CocoaPods installé, l'application sera prête à être testée !

