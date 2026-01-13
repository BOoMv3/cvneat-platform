# ✅ Checklist Avant Compilation iOS

## 🎯 Vérifications Essentielles

### 1. ✅ Configuration Capacitor
- [x] `capacitor.config.ts` configuré avec `server.url: 'https://cvneat.fr'`
- [x] Splash screen blanc configuré
- [x] Push Notifications configuré dans Capacitor

### 2. ✅ Configuration iOS Native
- [x] Icône 1024x1024 créée
- [x] Splash screen avec logo CVN'EAT
- [x] Push Notifications ajouté dans Xcode
- [x] `App.entitlements` avec `aps-environment`
- [x] Bundle ID: `fr.cvneat.app`

### 3. ⚠️ Variables d'Environnement APNs
**À VÉRIFIER dans `.env.local` :**
- [ ] `APNS_KEY_ID` = SFKS857CJX
- [ ] `APNS_TEAM_ID` = 54BYSZNUQY
- [ ] `APNS_BUNDLE_ID` = fr.cvneat.app
- [ ] `APNS_KEY_CONTENT` = (clé complète .p8)

**Test :** `node scripts/test-apns-config.js` doit retourner ✅

### 4. ⚠️ Configuration Supabase
**À VÉRIFIER :**
- [ ] `NEXT_PUBLIC_SUPABASE_URL` dans `.env.local`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` dans `.env.local`
- [ ] Les domaines sont autorisés dans Supabase Dashboard :
  - `capacitor://localhost`
  - `https://cvneat.fr`

### 5. ⚠️ Build Next.js
**IMPORTANT :** L'app utilise le serveur en production, mais il faut quand même builder :
```bash
npm run build
```

### 6. ⚠️ Permissions iOS (Info.plist)
**Vérifier dans `ios/App/App/Info.plist` :**
- [x] `WKAppBoundDomains` contient `cvneat.fr` et `supabase.co`
- [x] `NSAppTransportSecurity` permet les connexions HTTPS
- [ ] Si vous utilisez la caméra : `NSCameraUsageDescription`
- [ ] Si vous utilisez la localisation : `NSLocationWhenInUseUsageDescription`
- [ ] Si vous utilisez les photos : `NSPhotoLibraryUsageDescription`

### 7. ✅ Intercepteur API
- [x] `lib/fetch-interceptor.js` présent
- [x] `public/fetch-interceptor-inline.js` présent
- [x] Intercepteur chargé dans `app/layout.js`

### 8. ✅ Redirection Login
- [x] Page `/app-welcome` créée
- [x] Vérifie l'authentification
- [x] Redirige vers `/login` si non connecté

### 9. ⚠️ CORS sur le Serveur
**À VÉRIFIER sur Vercel/Production :**
Les headers CORS doivent autoriser :
- `Origin: capacitor://localhost`
- `Origin: https://cvneat.fr`

**Vérifier dans `next.config.js` ou middleware :**
```javascript
headers: [
  {
    key: 'Access-Control-Allow-Origin',
    value: '*', // Ou spécifiquement 'capacitor://localhost'
  },
]
```

### 10. ⚠️ Sessions Supabase
**IMPORTANT :** Les sessions Supabase doivent fonctionner dans Capacitor.

**Vérifier :**
- [ ] Les cookies sont bien gérés (Capacitor gère ça automatiquement)
- [ ] `supabase.auth.getSession()` fonctionne dans l'app

### 11. ⚠️ Notifications Push
**À TESTER après compilation :**
- [ ] L'app demande la permission pour les notifications
- [ ] Le token est enregistré dans `device_tokens`
- [ ] Les notifications fonctionnent en foreground
- [ ] Les notifications fonctionnent en background
- [ ] Les notifications fonctionnent quand l'app est fermée

### 12. ⚠️ Test des Fonctionnalités
**À TESTER après compilation :**
- [ ] Connexion/Inscription
- [ ] Affichage des restaurants
- [ ] Ajout au panier
- [ ] Passage de commande
- [ ] Paiement Stripe
- [ ] Suivi de commande
- [ ] Notifications push

## 🔧 Commandes à Exécuter Avant Compilation

```bash
# 1. Vérifier la configuration APNs
node scripts/test-apns-config.js

# 2. Builder Next.js (optionnel, car on utilise le serveur)
npm run build

# 3. Synchroniser Capacitor
npx cap sync ios

# 4. Ouvrir Xcode
npx cap open ios
```

## 📱 Dans Xcode

1. **Vérifier le Signing :**
   - Team sélectionné
   - Bundle ID: `fr.cvneat.app`
   - Provisioning Profile valide

2. **Vérifier les Capabilities :**
   - Push Notifications activé
   - Background Modes (si nécessaire)

3. **Vérifier le Scheme :**
   - Device sélectionné (pas Simulator pour les notifications)
   - Configuration: Debug ou Release

## ⚠️ Points d'Attention

### 1. Authentification
Les sessions Supabase doivent fonctionner. Si problème :
- Vérifier que `supabase.auth.getSession()` fonctionne
- Vérifier les cookies dans les DevTools Safari (connecter l'iPhone)

### 2. API Calls
Tous les appels `/api/*` sont interceptés et redirigés vers `https://cvneat.fr/api/*`.
Si problème :
- Vérifier les logs dans la console Xcode
- Vérifier les logs dans Safari DevTools

### 3. Notifications
Les notifications ne fonctionnent PAS sur le Simulator.
**OBLIGATOIRE :** Tester sur un iPhone réel.

### 4. Build Production
Pour la production :
- Changer `aps-environment` de `development` à `production` dans `App.entitlements`
- Utiliser un certificat de production
- Tester les notifications avec un certificat de production

## ✅ Checklist Finale

- [ ] Configuration APNs testée et validée
- [ ] Build Next.js exécuté (optionnel)
- [ ] `npx cap sync ios` exécuté
- [ ] Xcode ouvert et projet chargé
- [ ] Signing configuré dans Xcode
- [ ] Push Notifications visible dans Capabilities
- [ ] Device réel sélectionné (pas Simulator)
- [ ] Prêt à compiler !

---

**Une fois tout vérifié, vous pouvez compiler et tester sur votre iPhone !**

