# 📱 Checklist Complète - Tests Application iOS

## ✅ Configuration Apple Developer

- [ ] Compte Apple Developer actif (99€/an payé)
- [ ] Certificat de développement iOS créé
- [ ] Provisioning Profile configuré dans Xcode
- [ ] App ID configuré : `fr.cvneat.app`
- [ ] Push Notifications activées dans App ID
- [ ] Certificat APNs (Apple Push Notification service) configuré

## 🔔 Notifications Push (Critique)

### Configuration APNs
- [ ] Clé APNs créée dans Apple Developer (ou certificat APNs)
- [ ] Clé APNs ajoutée dans Supabase Dashboard → Settings → API → Push Notifications
- [ ] Variable d'environnement `SUPABASE_APNS_KEY` configurée (si nécessaire)

### Tests Notifications
- [ ] **Test 1** : Notification en foreground (app ouverte)
  - Ouvrir l'app
  - Passer une commande
  - Vérifier que la notification apparaît dans l'app
  
- [ ] **Test 2** : Notification en background (app en arrière-plan)
  - Ouvrir l'app puis la mettre en arrière-plan
  - Passer une commande
  - Vérifier que la notification apparaît sur l'écran de verrouillage
  
- [ ] **Test 3** : Notification hors app (app fermée)
  - Fermer complètement l'app (swipe up)
  - Passer une commande
  - Vérifier que la notification apparaît même si l'app est fermée
  
- [ ] **Test 4** : Notification livreur
  - Connecter un livreur dans l'app
  - Fermer l'app
  - Créer une commande et l'accepter (restaurant)
  - Vérifier que le livreur reçoit la notification
  
- [ ] **Test 5** : Notification client
  - Connecter un client dans l'app
  - Fermer l'app
  - Restaurant accepte la commande
  - Vérifier que le client reçoit la notification

## 🔄 Mise à Jour Automatique

### Test Synchronisation Menus
- [ ] **Test 1** : Ajout de plat
  - Restaurant ajoute un nouveau plat dans le dashboard
  - Client ouvre la page du restaurant dans l'app
  - Vérifier que le nouveau plat apparaît sans recharger
  
- [ ] **Test 2** : Suppression de plat
  - Restaurant supprime un plat dans le dashboard
  - Client ouvre la page du restaurant dans l'app
  - Vérifier que le plat n'apparaît plus sans recharger
  
- [ ] **Test 3** : Plat indisponible
  - Restaurant marque un plat comme indisponible
  - Client ouvre la page du restaurant dans l'app
  - Vérifier que le plat apparaît avec badge "Indisponible" sans recharger
  
- [ ] **Test 4** : Réactivation de plat
  - Restaurant réactive un plat indisponible
  - Client ouvre la page du restaurant dans l'app
  - Vérifier que le plat redevient disponible sans recharger

### Test Synchronisation Statut Restaurant
- [ ] **Test 1** : Fermeture manuelle
  - Restaurant ferme manuellement dans le dashboard
  - Client ouvre la page d'accueil dans l'app
  - Vérifier que le restaurant apparaît "Fermé" sans recharger
  
- [ ] **Test 2** : Ouverture manuelle
  - Restaurant ouvre manuellement dans le dashboard
  - Client ouvre la page d'accueil dans l'app
  - Vérifier que le restaurant apparaît "Ouvert" sans recharger

## 📦 Flux Complet Client

### Test Commande
- [ ] **Test 1** : Ajout au panier
  - Client ajoute des plats au panier
  - Vérifier que le panier se met à jour
  
- [ ] **Test 2** : Paiement
  - Client passe commande et paie
  - Vérifier que le paiement Stripe fonctionne
  - Vérifier que la commande est créée avec statut "en_attente"
  
- [ ] **Test 3** : Suivi de commande
  - Client suit sa commande
  - Restaurant accepte
  - Vérifier que le statut se met à jour en temps réel
  
- [ ] **Test 4** : Notification statut
  - Client ferme l'app après commande
  - Restaurant marque comme "Prête"
  - Vérifier que le client reçoit la notification

## 🍽️ Flux Complet Restaurant

### Test Dashboard Restaurant
- [ ] **Test 1** : Réception commande
  - Nouvelle commande arrive
  - Vérifier que la notification apparaît
  - Vérifier que la commande apparaît dans la liste
  
- [ ] **Test 2** : Acceptation commande
  - Restaurant accepte la commande
  - Vérifier que le livreur est notifié
  - Vérifier que le client est notifié
  
- [ ] **Test 3** : Préparation
  - Restaurant marque comme "Prête"
  - Vérifier que le livreur est notifié
  - Vérifier que le client est notifié
  
- [ ] **Test 4** : Remise au livreur
  - Restaurant clique "Remise au livreur"
  - Vérifier que le statut passe à "En livraison"
  - Vérifier que le client est notifié

## 🚚 Flux Complet Livreur

### Test Dashboard Livreur
- [ ] **Test 1** : Acceptation commande
  - Livreur accepte une commande
  - Vérifier que le restaurant est notifié
  - Vérifier que la commande apparaît dans "Mes commandes"
  
- [ ] **Test 2** : Notification nouvelle commande
  - Nouvelle commande disponible
  - Livreur ferme l'app
  - Vérifier que la notification apparaît même hors app
  
- [ ] **Test 3** : Livraison
  - Livreur marque comme livré
  - Vérifier que le client est notifié
  - Vérifier que le client peut noter le livreur

## 🔧 Configuration Technique

### Vérifications
- [ ] Capacitor configuré avec `server.url: 'https://cvneat.fr'`
- [ ] Intercepteur API fonctionne (redirige vers `https://cvneat.fr/api`)
- [ ] Table `device_tokens` existe dans Supabase
- [ ] API `/api/notifications/register-device` fonctionne
- [ ] API `/api/notifications/send-push` fonctionne
- [ ] Supabase Realtime activé pour les tables critiques

### Variables d'environnement
- [ ] `FIREBASE_SERVER_KEY` configurée (pour Android)
- [ ] Clé APNs configurée dans Supabase (pour iOS)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` configurée
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configurée

## 📝 Notes de Test

Date de test : _______________
Testeur : _______________
Version iOS testée : _______________
Version app : _______________

### Problèmes rencontrés :
1. 
2. 
3. 

### Solutions appliquées :
1. 
2. 
3. 

