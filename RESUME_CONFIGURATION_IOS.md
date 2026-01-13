# 📱 Résumé : Configuration et Tests Application iOS

## ✅ Ce qui a été fait

### 1. Synchronisation Temps Réel des Menus
- ✅ Ajout d'une subscription Supabase Realtime dans `app/restaurants/[id]/page.js`
- ✅ Les menus se mettent à jour automatiquement quand un restaurant :
  - Ajoute un plat
  - Supprime un plat
  - Marque un plat comme indisponible/disponible

### 2. Notifications Push iOS
- ✅ Configuration Capacitor pour iOS avec APNs
- ✅ Enregistrement automatique des tokens push
- ✅ API mise à jour pour supporter iOS et Android séparément
- ⚠️ **À FAIRE** : Configurer APNs dans Supabase Dashboard (voir `GUIDE_CONFIGURATION_APNS_IOS.md`)

### 3. Guides Créés
- ✅ `GUIDE_CONFIGURATION_APNS_IOS.md` - Configuration APNs
- ✅ `CHECKLIST_TEST_APP_IOS.md` - Checklist de tests
- ✅ `GUIDE_TEST_COMPLET_IOS.md` - Guide de test complet

## 🔧 Configuration Requise

### 1. APNs dans Supabase (CRITIQUE)
1. Créer une clé APNs dans Apple Developer
2. Configurer APNs dans Supabase Dashboard → Settings → API → Push Notifications
3. Voir `GUIDE_CONFIGURATION_APNS_IOS.md` pour les détails

### 2. Supabase Realtime
Vérifier dans Supabase Dashboard → Database → Replication que ces tables sont activées :
- ✅ `menus` - Pour la synchronisation des menus
- ✅ `commandes` - Pour les notifications de commandes
- ✅ `restaurants` - Pour les changements de statut

### 3. Xcode
- ✅ Ouvrir le projet : `npx cap open ios`
- ✅ Vérifier que "Push Notifications" est dans Signing & Capabilities
- ✅ Compiler et installer sur iPhone physique (pas simulateur)

## 🧪 Tests à Effectuer

### Tests Prioritaires
1. **Notifications Push** (voir `GUIDE_TEST_COMPLET_IOS.md`)
   - Test 1 : Notification en foreground
   - Test 2 : Notification en background
   - Test 3 : Notification hors app ⚠️ CRITIQUE
   - Test 4 : Notification livreur
   - Test 5 : Notification client

2. **Synchronisation Menus** (voir `GUIDE_TEST_COMPLET_IOS.md`)
   - Test 1 : Ajout de plat
   - Test 2 : Suppression de plat
   - Test 3 : Plat indisponible
   - Test 4 : Réactivation de plat

3. **Flux Complets**
   - Test client : Commande → Paiement → Suivi → Livraison
   - Test restaurant : Réception → Acceptation → Préparation → Remise livreur
   - Test livreur : Acceptation → Livraison → Notation

## 📝 Prochaines Étapes

1. **Configurer APNs dans Supabase** (voir `GUIDE_CONFIGURATION_APNS_IOS.md`)
2. **Vérifier Supabase Realtime** (Dashboard → Database → Replication)
3. **Builder l'app** : `npm run build:mobile` puis `npx cap sync`
4. **Ouvrir dans Xcode** : `npx cap open ios`
5. **Installer sur iPhone physique** (pas simulateur)
6. **Effectuer les tests** (voir `GUIDE_TEST_COMPLET_IOS.md`)

## ⚠️ Points Importants

1. **Les notifications ne fonctionnent PAS sur simulateur iOS** - Il faut un iPhone physique
2. **APNs doit être configuré dans Supabase** pour que les notifications iOS fonctionnent
3. **Supabase Realtime doit être activé** pour la synchronisation des menus
4. **L'app doit être lancée au moins une fois** après installation pour que les notifications hors app fonctionnent

## 🐛 Dépannage

### Les notifications ne fonctionnent pas
1. Vérifier APNs dans Supabase Dashboard
2. Vérifier que Push Notifications est activé dans Xcode
3. Vérifier que l'app est installée sur iPhone physique
4. Vérifier les permissions (Settings → CVN'EAT → Notifications)
5. Vérifier dans les logs Xcode que le token est enregistré

### Les menus ne se mettent pas à jour
1. Vérifier Supabase Realtime (Dashboard → Database → Replication)
2. Vérifier dans la console du navigateur les logs de subscription
3. Vérifier que l'app est connectée à Internet

