# 🔧 Guide : Corriger le Bundle Identifier dans Xcode

## ✅ Ce qui a été fait

Le Bundle Identifier a été corrigé dans le fichier `project.pbxproj` :
- ❌ Avant : `fr.cvneat.app.tony`
- ✅ Maintenant : `fr.cvneat.app`

## 🔄 Prochaines Étapes

### 1. Synchroniser Capacitor

Pour que le changement soit pris en compte :

```bash
npx cap sync ios
```

### 2. Ouvrir dans Xcode

```bash
npx cap open ios
```

### 3. Vérifier dans Xcode

Dans Xcode :

1. **Sélectionner** le projet "App" (icône bleue)
2. **Aller dans** "Signing & Capabilities"
3. **Vérifier** que le **Bundle Identifier** est bien `fr.cvneat.app`
   - Si ce n'est pas le cas, **modifier** manuellement dans Xcode

### 4. Vérifier le Signing

1. **Toujours dans** "Signing & Capabilities"
2. **Vérifier** que :
   - **Team** est sélectionné (votre équipe Apple Developer)
   - **Automatically manage signing** est coché
   - Le **Provisioning Profile** est généré automatiquement

### 5. Ajouter Push Notifications (si pas déjà fait)

1. **Dans** "Signing & Capabilities"
2. **Section "Capabilities"**
3. **Vérifier** si "Push Notifications" est présent
4. **Si absent** : Cliquer sur "+ Capability" → "Push Notifications"

## ⚠️ Important

Le Bundle Identifier doit correspondre **exactement** à :
- ✅ Celui dans `capacitor.config.ts` : `fr.cvneat.app`
- ✅ Celui dans Apple Developer (App ID) : `fr.cvneat.app`
- ✅ Celui dans les variables d'environnement : `APNS_BUNDLE_ID=fr.cvneat.app`

## 🐛 Si Xcode ne prend pas en compte le changement

1. **Fermer Xcode** complètement
2. **Nettoyer le projet** :
   ```bash
   cd ios/App
   xcodebuild clean
   cd ../..
   ```
3. **Synchroniser à nouveau** :
   ```bash
   npx cap sync ios
   ```
4. **Rouvrir Xcode** :
   ```bash
   npx cap open ios
   ```

## ✅ Vérification Finale

Dans Xcode → Signing & Capabilities, vous devriez voir :
- **Bundle Identifier** : `fr.cvneat.app` ✅
- **Team** : Votre équipe Apple Developer ✅
- **Push Notifications** : Présent dans Capabilities ✅

Une fois tout ça vérifié, vous pouvez builder et installer l'app sur votre iPhone !

