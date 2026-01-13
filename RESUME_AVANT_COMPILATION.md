# 📋 Résumé : Ce qu'il reste à faire avant compilation

## ✅ DÉJÀ FAIT

1. ✅ **Configuration APNs** - Testée et validée
2. ✅ **Icône et Splash Screen** - Créés
3. ✅ **Push Notifications** - Configuré dans Xcode
4. ✅ **Intercepteur API** - Présent et fonctionnel
5. ✅ **Redirection Login** - Page `/app-welcome` créée
6. ✅ **Variables d'environnement** - Présentes dans `.env.local`

## ⚠️ À VÉRIFIER AVANT COMPILATION

### 1. CORS sur Vercel (IMPORTANT)

**Le serveur doit autoriser les requêtes depuis Capacitor.**

Vérifiez dans Vercel que les headers CORS autorisent :
- `Origin: capacitor://localhost`
- `Origin: https://cvneat.fr`

**Si problème CORS :** Ajoutez dans `next.config.js` :
```javascript
async headers() {
  return [
    {
      source: '/api/:path*',
      headers: [
        {
          key: 'Access-Control-Allow-Origin',
          value: '*', // Ou spécifiquement 'capacitor://localhost'
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS',
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization',
        },
      ],
    },
  ];
},
```

### 2. Supabase - Domaines autorisés

**Dans Supabase Dashboard → Authentication → URL Configuration :**
- [ ] `capacitor://localhost` est dans les Redirect URLs
- [ ] `https://cvneat.fr` est dans les Redirect URLs
- [ ] `https://cvneat.fr/**` est dans les Redirect URLs

### 3. Build Next.js (Optionnel)

L'app utilise le serveur en production, donc le build n'est pas obligatoire.
Mais vous pouvez le faire pour tester :
```bash
npm run build
```

### 4. Synchronisation Capacitor

**OBLIGATOIRE avant compilation :**
```bash
npx cap sync ios
```

## 🎯 Commandes Finales

```bash
# 1. Vérifier APNs (déjà fait ✅)
node scripts/test-apns-config.js

# 2. Synchroniser Capacitor
npx cap sync ios

# 3. Ouvrir Xcode
npx cap open ios
```

## 📱 Dans Xcode - Vérifications Finales

1. **Signing & Capabilities :**
   - [ ] Team sélectionné
   - [ ] Bundle ID: `fr.cvneat.app`
   - [ ] Push Notifications visible et activé

2. **General :**
   - [ ] Version: 1.0
   - [ ] Build: 1
   - [ ] Deployment Target: iOS 15.6

3. **Device :**
   - [ ] **IMPORTANT :** Sélectionner un iPhone réel (pas Simulator)
   - Les notifications ne fonctionnent PAS sur le Simulator

## ⚠️ Points Critiques

### 1. CORS
**Le plus important !** Si les appels API échouent, c'est probablement CORS.
Vérifiez que Vercel autorise `capacitor://localhost`.

### 2. Notifications
**OBLIGATOIRE :** Tester sur un iPhone réel.
Le Simulator ne supporte pas les notifications push.

### 3. Authentification
Les sessions Supabase doivent fonctionner.
Si problème, vérifier les domaines dans Supabase Dashboard.

## ✅ Checklist Rapide

- [x] Configuration APNs testée
- [x] Variables d'environnement présentes
- [x] Intercepteur API configuré
- [ ] CORS vérifié sur Vercel
- [ ] Domaines Supabase configurés
- [ ] `npx cap sync ios` exécuté
- [ ] Xcode ouvert
- [ ] Device réel sélectionné
- [ ] Prêt à compiler !

## 🚀 Prêt à Compiler !

Une fois ces vérifications faites, vous pouvez compiler dans Xcode et tester sur votre iPhone.

**Bon test ! 🎉**

