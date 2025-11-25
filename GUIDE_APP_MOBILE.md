# 📱 Guide : Application Mobile CVN'EAT

## ✅ Configuration Capacitor terminée

Capacitor a été configuré avec succès pour transformer votre application web en applications mobiles natives pour iOS et Android.

## 🎯 Ce qui a été fait

### 1. Installation des dépendances
- ✅ `@capacitor/core` - Core Capacitor
- ✅ `@capacitor/cli` - CLI Capacitor
- ✅ `@capacitor/ios` - Support iOS
- ✅ `@capacitor/android` - Support Android
- ✅ `typescript` - Requis pour la configuration

### 2. Configuration
- ✅ Fichier `capacitor.config.ts` configuré
- ✅ Scripts npm ajoutés au `package.json`
- ✅ Projet Android initialisé

### 3. Structure créée
```
cvneat-pages/
├── android/              ← Projet Android natif (NOUVEAU)
├── capacitor.config.ts   ← Configuration Capacitor (MIS À JOUR)
└── package.json          ← Scripts Capacitor ajoutés (MODIFIÉ)
```

## 🔒 Garanties

✅ **Aucun code existant modifié** - Seuls des fichiers de configuration ont été ajoutés
✅ **Site web intact** - Votre site continue de fonctionner normalement
✅ **Pas d'impact sur Vercel** - Le déploiement reste identique

## 📱 Prochaines étapes

### Pour Android (Windows/Mac/Linux)

1. **Installer Android Studio**
   - Télécharger : https://developer.android.com/studio
   - Installer Android SDK et les outils requis

2. **Ouvrir le projet Android**
   ```bash
   npm run capacitor:open:android
   ```
   Cela ouvrira Android Studio avec le projet Android.

3. **Configurer l'app**
   - Dans Android Studio, configurez votre signature d'application
   - Créez un keystore pour signer l'APK/AAB

4. **Tester l'app**
   - Connectez un appareil Android ou utilisez un émulateur
   - Cliquez sur "Run" dans Android Studio

5. **Build pour production**
   - Build > Generate Signed Bundle / APK
   - Suivez les étapes pour créer un AAB (Android App Bundle)

### Pour iOS (macOS uniquement)

⚠️ **Nécessite macOS avec Xcode installé**

1. **Installer Xcode**
   - Télécharger depuis l'App Store
   - Installer les command line tools : `xcode-select --install`

2. **Ajouter la plateforme iOS**
   ```bash
   npx cap add ios
   ```

3. **Ouvrir le projet iOS**
   ```bash
   npm run capacitor:open:ios
   ```
   Cela ouvrira Xcode avec le projet iOS.

4. **Configurer l'app**
   - Configurez votre Team de développement Apple
   - Configurez les certificats et provisioning profiles
   - Configurez les capabilities (Push Notifications, etc.)

5. **Tester l'app**
   - Connectez un iPhone/iPad ou utilisez le simulateur
   - Cliquez sur "Run" dans Xcode

6. **Build pour production**
   - Product > Archive
   - Suivez les étapes pour soumettre à l'App Store

## 🔄 Workflow de développement

### Après chaque modification du code web :

1. **Build Next.js**
   ```bash
   npm run build
   ```

2. **Synchroniser avec les apps natives**
   ```bash
   npm run capacitor:sync
   ```
   Cette commande copie les fichiers web dans les projets natifs.

3. **Tester dans les apps**
   - Ouvrez Android Studio ou Xcode
   - Testez les modifications

## 📝 Scripts disponibles

```bash
# Synchroniser les fichiers web avec les apps natives
npm run capacitor:sync

# Copier uniquement les fichiers web
npm run capacitor:copy

# Mettre à jour les plugins Capacitor
npm run capacitor:update

# Ouvrir le projet iOS dans Xcode (macOS uniquement)
npm run capacitor:open:ios

# Ouvrir le projet Android dans Android Studio
npm run capacitor:open:android
```

## 🌐 Configuration actuelle

L'application mobile est configurée pour charger le site web depuis :
- **URL de production** : `https://cvneat.fr`

Cela signifie que :
- ✅ Les apps mobiles utilisent le même code que le site web
- ✅ Les mises à jour du site sont automatiquement disponibles dans les apps
- ✅ Pas besoin de rebuild les apps pour chaque modification

### Mode développement (optionnel)

Pour tester avec un serveur local pendant le développement, modifiez `capacitor.config.ts` :

```typescript
server: {
  url: 'http://localhost:3000',  // Pour développement local
  cleartext: true                 // Nécessaire pour HTTP
}
```

⚠️ **Important** : Remettez l'URL de production avant de build pour les stores !

## 🎨 Personnalisation

### Splash Screen
Le splash screen est configuré avec :
- Couleur de fond : `#ea580c` (orange CVN'EAT)
- Durée d'affichage : 2 secondes
- Auto-hide activé

### Status Bar
- Style : Dark
- Couleur de fond : `#ea580c`

Pour modifier ces paramètres, éditez `capacitor.config.ts`.

## 📦 Plugins Capacitor disponibles

Vous pouvez ajouter des plugins pour :
- 📷 **Camera** : `@capacitor/camera`
- 📍 **Geolocation** : `@capacitor/geolocation`
- 🔔 **Push Notifications** : `@capacitor/push-notifications`
- 💾 **Storage** : `@capacitor/storage`
- Et bien d'autres : https://capacitorjs.com/docs/plugins

## 🚀 Publication sur les stores

### Google Play Store (Android)

1. **Créer un compte développeur**
   - Coût : 25$ (une seule fois)
   - URL : https://play.google.com/console

2. **Préparer les assets**
   - Icône de l'app (512x512)
   - Screenshots (minimum 2)
   - Description de l'app
   - Politique de confidentialité

3. **Créer un AAB (Android App Bundle)**
   - Dans Android Studio : Build > Generate Signed Bundle / APK
   - Choisissez "Android App Bundle"
   - Signez avec votre keystore

4. **Soumettre sur Google Play Console**
   - Créez une nouvelle application
   - Téléversez le AAB
   - Remplissez les informations
   - Soumettez pour révision

### Apple App Store (iOS)

1. **Créer un compte développeur**
   - Coût : 99$/an
   - URL : https://developer.apple.com/programs/

2. **Préparer les assets**
   - Icône de l'app (1024x1024)
   - Screenshots pour différentes tailles d'iPhone/iPad
   - Description de l'app
   - Politique de confidentialité

3. **Créer un Archive**
   - Dans Xcode : Product > Archive
   - Suivez les étapes pour créer l'archive

4. **Soumettre via Xcode ou App Store Connect**
   - Connectez-vous à App Store Connect
   - Créez une nouvelle application
   - Téléversez l'archive
   - Remplissez les informations
   - Soumettez pour révision

## ⏱️ Délais de validation

- **Google Play** : 1-3 jours généralement
- **Apple App Store** : 1-7 jours généralement

## 🔧 Dépannage

### Erreur "webDir not found"
- Assurez-vous d'avoir fait `npm run build` avant `npm run capacitor:sync`

### L'app ne charge pas le site
- Vérifiez l'URL dans `capacitor.config.ts`
- Vérifiez votre connexion internet
- Vérifiez que le site est accessible depuis un navigateur

### Erreurs de build Android
- Vérifiez que Android Studio est à jour
- Vérifiez que le SDK Android est installé
- Nettoyez le projet : `cd android && ./gradlew clean`

### Erreurs de build iOS
- Vérifiez que Xcode est à jour
- Vérifiez que les certificats sont valides
- Nettoyez le projet : `cd ios && xcodebuild clean`

## 📞 Support

Pour plus d'informations :
- Documentation Capacitor : https://capacitorjs.com/docs
- Guide Next.js + Capacitor : https://capacitorjs.com/docs/guides/nextjs

---

**✅ Configuration terminée !** Votre application est prête à être transformée en apps mobiles natives. Le site web continue de fonctionner normalement, sans aucun impact.

