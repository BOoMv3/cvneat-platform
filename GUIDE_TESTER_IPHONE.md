# 📱 Guide : Tester l'App sur votre iPhone

## ✅ Prérequis

1. **Mac avec Xcode installé** (déjà fait ✅)
2. **iPhone avec iOS 13+**
3. **Cable USB** pour connecter l'iPhone au Mac
4. **Compte Apple ID** (gratuit, celui de votre iPhone)

---

## 🚀 Étapes pour Tester sur iPhone

### Étape 1 : Connecter votre iPhone

1. **Connectez votre iPhone** au Mac avec le câble USB
2. Sur votre iPhone : **Settings** → **General** → **VPN & Device Management**
   - Si un message apparaît, appuyez sur **"Trust This Computer"**
   - Entrez votre code PIN si demandé

### Étape 2 : Ouvrir le Projet dans Xcode

```bash
cd /Users/boomv3/Desktop/cvneat-platform
npm run capacitor:open:ios
```

Ou manuellement :
```bash
open ios/App/App.xcworkspace
```

### Étape 3 : Configurer le Signing (IMPORTANT)

1. Dans Xcode, sélectionnez le projet **App** dans le panneau de gauche
2. Sélectionnez la cible **App** sous "TARGETS"
3. Allez dans l'onglet **"Signing & Capabilities"**
4. **Cochez "Automatically manage signing"**
5. **Sélectionnez votre Team** (votre compte Apple)
   - Si vous n'avez pas de team : **Xcode** → **Settings** (ou **Preferences**) → **Accounts** → Cliquez sur **"+"** → Ajoutez votre Apple ID

### Étape 4 : Sélectionner votre iPhone

1. En haut de Xcode, à côté du bouton Play, cliquez sur le menu déroulant
2. **Sélectionnez votre iPhone** dans la liste des appareils
   - Il devrait apparaître comme "iPhone de [Votre Nom]" ou le nom de votre iPhone

### Étape 5 : Lancer l'Application

1. Cliquez sur le bouton **▶️ Play** (ou appuyez sur `Cmd + R`)
2. **Première fois uniquement** : Xcode va compiler et installer (5-10 minutes)
3. Sur votre iPhone, un message peut apparaître : **"Untrusted Developer"**
   - Allez dans **Settings** → **General** → **VPN & Device Management**
   - Trouvez votre profil de développeur (votre email)
   - Appuyez sur **"Trust [Votre Email]"**
   - Confirmez avec **"Trust"**
4. Retournez dans l'app, elle devrait maintenant se lancer !

---

## 🔄 Mettre à Jour l'App après Modifications

Chaque fois que vous modifiez le code :

```bash
# 1. Rebuilder l'app
npm run build:mobile

# 2. Synchroniser avec Capacitor
npx cap sync ios

# 3. Dans Xcode, cliquez sur ▶️ Play pour relancer
```

**Astuce :** Vous pouvez aussi faire **Product** → **Clean Build Folder** (`Shift + Cmd + K`) dans Xcode avant de rebuilder.

---

## ⚠️ Résolution de Problèmes

### "No provisioning profiles found"

1. Dans Xcode : **Settings** → **Accounts**
2. Sélectionnez votre compte Apple
3. Cliquez sur **"Download Manual Profiles"**
4. Retournez dans **Signing & Capabilities** et sélectionnez votre Team

### "Cannot install on device"

1. Vérifiez que vous avez **autorisé l'app** dans Settings → General → VPN & Device Management
2. Vérifiez que votre **Team** est bien sélectionnée dans Xcode
3. Vérifiez que le **Bundle ID** est unique (ne changez rien, c'est déjà configuré)

### "App crashes on launch"

1. Vérifiez les logs dans Xcode : **View** → **Debug Area** → **Show Debug Area** (ou `Cmd + Shift + Y`)
2. Vérifiez que `npm run build:mobile` s'est bien terminé sans erreur
3. Vérifiez que les API fonctionnent : Testez `https://cvneat.fr/api` dans un navigateur

### "Build failed"

1. Dans Xcode : **Product** → **Clean Build Folder** (`Shift + Cmd + K`)
2. Fermez Xcode
3. Relancez :
   ```bash
   cd ios/App
   rm -rf Pods Podfile.lock
   pod install
   cd ../..
   npm run build:mobile
   npx cap sync ios
   ```
4. Rouvrez Xcode et réessayez

---

## 📝 Notes Importantes

- **Première installation** : 5-10 minutes (compilation)
- **Mises à jour suivantes** : 1-3 minutes
- **L'app reste installée** sur votre iPhone même après déconnexion du câble
- **Pour désinstaller** : Appuyez longuement sur l'icône de l'app → Supprimer

---

## 🎯 Différence : Simulateur vs iPhone Réel

| Simulateur | iPhone Réel |
|------------|-------------|
| ✅ Gratuit, pas besoin d'iPhone | ✅ Test sur vrai appareil |
| ✅ Rapide à lancer | ✅ Test des notifications push |
| ✅ Pas besoin de câble | ✅ Test de la géolocalisation |
| ❌ Pas de notifications push | ✅ Test de la performance réelle |
| ❌ Pas de géolocalisation réelle | ✅ Test de l'apparence réelle |

**Recommandation :** Testez d'abord sur le simulateur, puis sur votre iPhone pour valider les fonctionnalités natives (notifications, géolocalisation).

---

**Vous êtes prêt à tester sur votre iPhone ! 🎉**

