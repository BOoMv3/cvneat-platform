# 📱 Guide : Créer l'application iOS native

Ce guide vous explique comment créer une **application iOS native** pour CVN'EAT que vous pouvez installer directement sur iPhone/iPad, **sans passer par le navigateur**.

## 🎯 Objectif

Créer une application iOS (IPA) que vous pouvez :
- Installer directement sur iPhone/iPad via Xcode
- Tester sur un simulateur iOS
- Distribuer via TestFlight (pour les testeurs)
- Publier sur l'App Store (plus tard)

## 📋 Prérequis

### 1. Installer Xcode

1. **Ouvrez l'App Store** sur votre Mac
2. **Recherchez "Xcode"**
3. **Cliquez sur "Obtenir"** (gratuit, mais prend ~12GB et 30-60 minutes)
4. **Lancez Xcode** après l'installation
5. **Acceptez les licences** : Dans le menu Xcode → Settings → Locations, cliquez sur "Download" pour les composants supplémentaires

### 2. Installer CocoaPods (gestionnaire de dépendances iOS)

Ouvrez le **Terminal** et exécutez :

```bash
sudo gem install cocoapods
```

⏱️ Durée : 2-5 minutes

### 3. Créer un compte Apple Developer (gratuit pour tester)

1. Allez sur https://developer.apple.com
2. Cliquez sur "Account" en haut
3. Connectez-vous avec votre Apple ID
4. Acceptez les conditions (gratuit)

**Note** : Le compte gratuit permet de tester sur votre appareil pendant 7 jours. Pour publier sur l'App Store, il faut un compte payant ($99/an).

## 🚀 Étapes pour créer l'app iOS

### Étape 1 : Build l'application Next.js

Dans votre terminal, depuis le dossier du projet :

```bash
npm run build:mobile
```

Ce script va :
1. Builder Next.js en fichiers statiques
2. Synchroniser avec Capacitor
3. Préparer les fichiers pour iOS

**⏱️ Durée :** 2-5 minutes

### Étape 2 : Créer le projet iOS avec Capacitor

Si le dossier `ios/` n'existe pas encore, créez-le :

```bash
npx cap add ios
```

Cela va créer le dossier `ios/` avec tout le projet Xcode.

**⏱️ Durée :** 1-2 minutes

### Étape 3 : Installer les dépendances iOS (CocoaPods)

```bash
cd ios/App
pod install
cd ../..
```

**⏱️ Durée :** 5-10 minutes (première fois)

### Étape 4 : Synchroniser les fichiers

```bash
npx cap sync ios
```

Cette commande copie tous les fichiers web dans le projet iOS.

### Étape 5 : Ouvrir le projet dans Xcode

```bash
npx cap open ios
```

Ou ouvrez manuellement : **Xcode** → **File** → **Open** → Sélectionnez `ios/App/App.xcworkspace` (⚠️ **xcworkspace**, pas xcodeproj)

**⏱️ Attendre** : Xcode va indexer les fichiers (première fois : 5-10 minutes)

## 📱 Configurer l'application iOS

### Configuration du Bundle ID et de l'équipe

1. Dans Xcode, sélectionnez le projet **App** dans le panneau de gauche
2. Sélectionnez la cible **App** sous "TARGETS"
3. Allez dans l'onglet **"Signing & Capabilities"**
4. **Cochez "Automatically manage signing"**
5. Sélectionnez votre **Team** (votre compte Apple Developer)
6. Xcode va automatiquement créer un **Provisioning Profile**

Si vous voyez une erreur, cliquez sur "Add Account..." et connectez-vous avec votre Apple ID.

### Configuration des permissions

Dans le même onglet "Signing & Capabilities", ajoutez les capacités nécessaires :

1. **Push Notifications** : Cliquez sur "+ Capability" → "Push Notifications"
2. **Location Services** : "+ Capability" → "Location Services"
3. **Camera** : Pour prendre des photos de commandes (optionnel)

## 🎨 Personnaliser l'application

### Changer l'icône de l'app

1. Dans Xcode, ouvrez `ios/App/App/Assets.xcassets`
2. Remplacez les fichiers d'icône dans `AppIcon.appiconset`
3. Vous pouvez utiliser un outil en ligne : https://www.appicon.co

### Changer le nom de l'app

1. Dans Xcode, sélectionnez le projet **App**
2. Onglet **"General"**
3. Modifiez **Display Name** : "CVN'EAT"

### Configurer l'écran de démarrage (Splash Screen)

Les paramètres sont déjà dans `capacitor.config.ts`. Si vous voulez changer :

1. Modifiez `capacitor.config.ts`
2. Relancez `npx cap sync ios`

## 🧪 Tester l'application

### Option 1 : Sur le simulateur iOS (gratuit, pas besoin d'iPhone)

1. En haut de Xcode, sélectionnez un **simulateur** (ex: "iPhone 15 Pro")
2. Cliquez sur le bouton **▶️ Play** (ou `Cmd + R`)
3. Le simulateur va s'ouvrir et lancer votre app

**⏱️ Première fois :** 2-3 minutes (téléchargement du simulateur)

### Option 2 : Sur votre iPhone réel

1. **Connectez votre iPhone** via USB à votre Mac
2. Sur votre iPhone : **Settings** → **General** → **VPN & Device Management**
   - Appuyez sur "Trust This Computer" si demandé
3. Dans Xcode, sélectionnez votre iPhone dans la liste des appareils (en haut)
4. Cliquez sur **▶️ Play** (ou `Cmd + R`)
5. Sur votre iPhone : **Settings** → **General** → **VPN & Device Management**
   - Trouvez votre profil de développeur
   - Appuyez sur "Trust" pour autoriser l'app

**⏱️ Première fois :** Xcode va compiler et installer (5-10 minutes)

## 📦 Créer un fichier IPA (pour distribution)

### Pour TestFlight ou distribution interne

1. Dans Xcode, sélectionnez **"Any iOS Device"** comme destination
2. Menu : **Product** → **Archive**
3. Attendez la fin de l'archivage
4. L'**Organizer** va s'ouvrir
5. Sélectionnez votre archive et cliquez sur **"Distribute App"**
6. Choisissez votre méthode de distribution :
   - **App Store Connect** : Pour TestFlight ou App Store
   - **Ad Hoc** : Pour distribuer à des appareils spécifiques
   - **Development** : Pour tester sur d'autres appareils

## 🔄 Mettre à jour l'app

Chaque fois que vous modifiez le code :

1. **Rebuilder :**
   ```bash
   npm run build:mobile
   npx cap sync ios
   ```

2. **Dans Xcode :**
   - Cliquez sur **▶️ Play** pour relancer
   - Ou faites **Product** → **Clean Build Folder** (`Shift + Cmd + K`) puis rebuild

## ⚙️ Configuration importante

### Les API fonctionnent automatiquement

L'app utilise un **intercepteur automatique** qui redirige tous les appels API vers `https://cvneat.fr/api`. **Aucune modification nécessaire !**

### Changer l'URL de l'API

Si vous voulez pointer vers un autre serveur, modifiez `lib/api-config.js` :

```javascript
return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr';
```

## 🔐 Permissions iOS

L'app demande automatiquement les permissions suivantes :

- **Notifications** : Pour les alertes de commande
- **Localisation** : Pour trouver les restaurants proches
- **Caméra** : Pour prendre des photos (optionnel)

Les messages sont configurés dans `Info.plist` (géré par Capacitor).

## 🐛 Résolution de problèmes

### "Xcode command line tools not configured"

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
```

### "No provisioning profiles found"

1. Dans Xcode : **Settings** → **Accounts**
2. Ajoutez votre Apple ID
3. Cliquez sur "Download Manual Profiles"
4. Dans le projet, sélectionnez votre Team

### "App crashes on launch"

1. Vérifiez les logs dans Xcode : **View** → **Debug Area** → **Show Debug Area**
2. Vérifiez que `npm run build:mobile` s'est bien terminé
3. Vérifiez que les API fonctionnent : Testez `https://cvneat.fr/api` dans un navigateur

### "Cannot install on device"

1. Vérifiez que vous avez **autorisé l'app** dans Settings → General → VPN & Device Management
2. Vérifiez que votre **Team** est bien sélectionnée dans Xcode
3. Vérifiez que le **Bundle ID** est unique

### "Build failed - Pods"

```bash
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
```

## 📝 Différences : App native vs Navigateur

| Navigateur | App Native iOS |
|------------|----------------|
| Ouvre dans Safari | Application séparée |
| Icône dans les favoris | Icône dans le menu apps |
| Charge depuis internet | Fichiers locaux (plus rapide) |
| Peut être fermée par erreur | Reste ouverte comme une vraie app |
| Pas de notifications push | Notifications push complètes |
| Pas d'accès aux fonctionnalités | Accès caméra, GPS, etc. |

## 🎉 C'est tout !

Vous avez maintenant une **vraie application iOS** qui fonctionne indépendamment du navigateur !

## 📝 Prochaines étapes (optionnel)

- **Publier sur TestFlight** : Distribuez à des testeurs avant la publication
- **Publier sur l'App Store** : Créez un compte développeur payant ($99/an)
- **Ajouter des icônes personnalisées** : Utilisez https://www.appicon.co
- **Configurer les notifications push** : Utilisez APNs (Apple Push Notification service)

## 🔗 Commandes utiles

```bash
# Build et sync
npm run build:mobile
npx cap sync ios

# Ouvrir Xcode
npx cap open ios

# Installer les dépendances iOS
cd ios/App && pod install && cd ../..

# Nettoyer et réinstaller
cd ios/App && rm -rf Pods Podfile.lock && pod install && cd ../..
```





