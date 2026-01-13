# 🔧 Fix : Écran Blanc dans l'App iOS

## ❌ Problème

L'app affiche un écran blanc au lancement avec les erreurs :
- "JS Eval error JavaScript execution targeted a frame that is not in an app-bound domain"
- "WebView failed provisional navigation"
- "Error: Chargement du cadre interrompu"

## ✅ Solutions Appliquées

### 1. Ajout de `localhost` dans WKAppBoundDomains

Ajouté `localhost` dans `Info.plist` pour permettre les navigations locales.

### 2. Configuration Capacitor

Vérifié que `limitsNavigationsToAppBoundDomains: false` est bien configuré.

## 🔄 Prochaines Étapes

1. **Synchroniser Capacitor :**
   ```bash
   npx cap sync ios
   ```

2. **Recompiler dans Xcode :**
   - Nettoyer le build : `Cmd + Shift + K`
   - Recompiler : `Cmd + R`

3. **Si le problème persiste :**

   **Option A : Retirer complètement WKAppBoundDomains**
   
   Si `limitsNavigationsToAppBoundDomains: false` ne fonctionne pas, on peut retirer `WKAppBoundDomains` de `Info.plist`.

   **Option B : Vérifier la page d'accueil**
   
   Vérifier que `https://cvneat.fr` charge correctement dans Safari sur l'iPhone.

   **Option C : Utiliser le build local**
   
   Au lieu d'utiliser le serveur distant, builder l'app localement :
   ```bash
   npm run build
   npx cap sync ios
   ```
   
   Et dans `capacitor.config.ts`, retirer la section `server` :
   ```typescript
   // server: {
   //   url: 'https://cvneat.fr',
   //   cleartext: false
   // },
   ```

## 🐛 Debug

Pour voir les erreurs détaillées :
1. Dans Xcode, ouvrez la console (panneau du bas)
2. Filtrez par "Error" ou "WebView"
3. Regardez les messages d'erreur complets

## ✅ Test

Après les corrections :
1. L'app doit charger `https://cvneat.fr`
2. Le splash screen doit s'afficher
3. La page doit se charger correctement

---

**Essayez de recompiler et dites-moi si ça fonctionne !**

