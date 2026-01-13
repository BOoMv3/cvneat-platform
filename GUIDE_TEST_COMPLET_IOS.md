# 🧪 Guide de Test Complet - Application iOS

## 📋 Checklist Pré-Test

### Configuration Apple Developer
- [ ] Compte Apple Developer actif (99€/an payé)
- [ ] Certificat de développement iOS créé dans Xcode
- [ ] Provisioning Profile configuré
- [ ] App ID : `fr.cvneat.app` avec Push Notifications activées
- [ ] Clé APNs créée et configurée dans Supabase (voir `GUIDE_CONFIGURATION_APNS_IOS.md`)

### Build de l'Application
- [ ] `npm run build:mobile` exécuté avec succès
- [ ] `npx cap sync` exécuté
- [ ] Projet iOS ouvert dans Xcode : `npx cap open ios`
- [ ] App compilée et installée sur iPhone physique (⚠️ Pas de simulateur pour les notifications)

## 🔔 Tests Notifications Push

### Test 1 : Notification en Foreground (App Ouverte)
1. **Ouvrir l'app** sur iPhone
2. **Se connecter** en tant que livreur ou restaurant
3. **Laisser l'app ouverte** sur l'écran principal
4. **Créer une commande** depuis le site web (ou un autre appareil)
5. **Vérifier** :
   - ✅ La notification apparaît dans l'app
   - ✅ Le son de notification se joue
   - ✅ Le badge s'incrémente

### Test 2 : Notification en Background (App en Arrière-plan)
1. **Ouvrir l'app** sur iPhone
2. **Se connecter** en tant que livreur ou restaurant
3. **Mettre l'app en arrière-plan** (appuyer sur le bouton home)
4. **Créer une commande** depuis le site web
5. **Vérifier** :
   - ✅ La notification apparaît sur l'écran de verrouillage
   - ✅ Le son de notification se joue
   - ✅ Le badge s'incrémente
   - ✅ En cliquant sur la notification, l'app s'ouvre sur la bonne page

### Test 3 : Notification Hors App (App Fermée)
1. **Ouvrir l'app** sur iPhone (au moins une fois après installation)
2. **Se connecter** en tant que livreur ou restaurant
3. **Fermer complètement l'app** (swipe up dans le multitâche)
4. **Créer une commande** depuis le site web
5. **Vérifier** :
   - ✅ La notification apparaît même si l'app est fermée
   - ✅ Le son de notification se joue
   - ✅ Le badge s'incrémente
   - ✅ En cliquant sur la notification, l'app s'ouvre

### Test 4 : Notification Livreur
1. **Connecter un livreur** dans l'app
2. **Fermer l'app** complètement
3. **Créer une commande** depuis le site web
4. **Accepter la commande** en tant que restaurant
5. **Vérifier** :
   - ✅ Le livreur reçoit la notification "Nouvelle commande disponible"
   - ✅ La notification fonctionne même si l'app est fermée

### Test 5 : Notification Client
1. **Connecter un client** dans l'app
2. **Passer une commande** depuis l'app
3. **Fermer l'app** complètement
4. **Restaurant accepte** la commande
5. **Vérifier** :
   - ✅ Le client reçoit la notification "Votre commande a été acceptée"
   - ✅ La notification fonctionne même si l'app est fermée

## 🔄 Tests Mise à Jour Automatique

### Test 1 : Ajout de Plat
1. **Ouvrir l'app** sur iPhone
2. **Aller sur** la page d'un restaurant
3. **Dans le dashboard restaurant** (sur ordinateur), **ajouter un nouveau plat**
4. **Dans l'app** (sans recharger), **vérifier** :
   - ✅ Le nouveau plat apparaît automatiquement
   - ✅ Pas besoin de fermer/rouvrir l'app

### Test 2 : Suppression de Plat
1. **Ouvrir l'app** sur iPhone
2. **Aller sur** la page d'un restaurant
3. **Noter** un plat présent dans le menu
4. **Dans le dashboard restaurant**, **supprimer ce plat**
5. **Dans l'app** (sans recharger), **vérifier** :
   - ✅ Le plat disparaît automatiquement
   - ✅ Pas besoin de fermer/rouvrir l'app

### Test 3 : Plat Indisponible
1. **Ouvrir l'app** sur iPhone
2. **Aller sur** la page d'un restaurant
3. **Noter** un plat disponible
4. **Dans le dashboard restaurant**, **marquer ce plat comme indisponible**
5. **Dans l'app** (sans recharger), **vérifier** :
   - ✅ Le plat apparaît avec badge "Indisponible"
   - ✅ Le plat ne peut plus être ajouté au panier
   - ✅ Pas besoin de fermer/rouvrir l'app

### Test 4 : Réactivation de Plat
1. **Ouvrir l'app** sur iPhone
2. **Aller sur** la page d'un restaurant
3. **Noter** un plat indisponible
4. **Dans le dashboard restaurant**, **réactiver ce plat**
5. **Dans l'app** (sans recharger), **vérifier** :
   - ✅ Le plat redevient disponible
   - ✅ Le plat peut être ajouté au panier
   - ✅ Pas besoin de fermer/rouvrir l'app

### Test 5 : Statut Restaurant (Ouvert/Fermé)
1. **Ouvrir l'app** sur iPhone
2. **Aller sur** la page d'accueil
3. **Noter** le statut d'un restaurant (ouvert/fermé)
4. **Dans le dashboard restaurant**, **changer le statut** (ouvrir/fermer manuellement)
5. **Dans l'app** (sans recharger), **vérifier** :
   - ✅ Le statut se met à jour automatiquement
   - ✅ Le badge "Fermé" apparaît/disparaît
   - ✅ Pas besoin de fermer/rouvrir l'app

## 📦 Tests Flux Complet Client

### Test 1 : Commande Complète
1. **Ouvrir l'app** sur iPhone
2. **Se connecter** en tant que client
3. **Ajouter des plats** au panier
4. **Vérifier** :
   - ✅ Le panier se met à jour
   - ✅ Le total est correct
5. **Passer commande** et **payer**
6. **Vérifier** :
   - ✅ Le paiement Stripe fonctionne
   - ✅ La commande est créée avec statut "en_attente"
   - ✅ La page de confirmation s'affiche

### Test 2 : Suivi de Commande
1. **Passer une commande** depuis l'app
2. **Aller sur** la page de suivi de commande
3. **Restaurant accepte** la commande
4. **Vérifier** :
   - ✅ Le statut se met à jour en temps réel
   - ✅ La notification apparaît
5. **Restaurant marque comme "Prête"**
6. **Vérifier** :
   - ✅ Le statut se met à jour
   - ✅ La notification apparaît
7. **Livreur livre** la commande
8. **Vérifier** :
   - ✅ Le statut passe à "Livrée"
   - ✅ La notification apparaît
   - ✅ Le formulaire de notation du livreur s'affiche

## 🍽️ Tests Flux Complet Restaurant

### Test 1 : Réception Commande
1. **Ouvrir l'app** sur iPhone (restaurant)
2. **Se connecter** en tant que restaurant
3. **Créer une commande** depuis le site web (client)
4. **Vérifier** :
   - ✅ La notification apparaît dans l'app
   - ✅ La commande apparaît dans la liste
   - ✅ Le son de notification se joue

### Test 2 : Acceptation Commande
1. **Recevoir une commande** dans l'app
2. **Accepter la commande** avec un temps de préparation
3. **Vérifier** :
   - ✅ Le livreur est notifié
   - ✅ Le client est notifié
   - ✅ Le statut passe à "En préparation"

### Test 3 : Préparation
1. **Accepter une commande**
2. **Marquer comme "Prête"**
3. **Vérifier** :
   - ✅ Le livreur est notifié
   - ✅ Le client est notifié
   - ✅ Le statut passe à "Prête"

### Test 4 : Remise au Livreur
1. **Marquer une commande comme "Prête"**
2. **Attendre** que le livreur accepte
3. **Cliquer sur "Remise au livreur"**
4. **Vérifier** :
   - ✅ Le statut passe à "En livraison"
   - ✅ Le client est notifié

## 🚚 Tests Flux Complet Livreur

### Test 1 : Acceptation Commande
1. **Ouvrir l'app** sur iPhone (livreur)
2. **Se connecter** en tant que livreur
3. **Créer une commande** depuis le site web
4. **Accepter la commande** dans l'app livreur
5. **Vérifier** :
   - ✅ Le restaurant est notifié
   - ✅ Le client est notifié
   - ✅ La commande apparaît dans "Mes commandes"

### Test 2 : Notification Nouvelle Commande
1. **Connecter un livreur** dans l'app
2. **Fermer l'app** complètement
3. **Créer une commande** depuis le site web
4. **Accepter la commande** en tant que restaurant
5. **Vérifier** :
   - ✅ Le livreur reçoit la notification "Nouvelle commande disponible"
   - ✅ La notification fonctionne même si l'app est fermée

### Test 3 : Livraison
1. **Accepter une commande** dans l'app livreur
2. **Aller chercher** la commande au restaurant
3. **Livrer** la commande au client
4. **Marquer comme "Livrée"**
5. **Vérifier** :
   - ✅ Le client est notifié
   - ✅ Le client peut noter le livreur
   - ✅ Le statut passe à "Livrée"

## 🔧 Vérifications Techniques

### Vérifier les Tokens
Dans Supabase SQL Editor :
```sql
SELECT platform, COUNT(*) as count, MAX(created_at) as last_token
FROM device_tokens
GROUP BY platform;
```

Vous devriez voir des tokens iOS avec `platform = 'ios'`.

### Vérifier les Notifications Envoyées
Dans les logs Xcode (Console), chercher :
- `Token push reçu:` - Confirme que le token est enregistré
- `Token enregistré avec succès` - Confirme que le token est sauvegardé
- `Notification reçue:` - Confirme qu'une notification est reçue

### Vérifier Supabase Realtime
Dans Supabase Dashboard → Database → Replication :
- ✅ Vérifier que `menus` est activé pour Realtime
- ✅ Vérifier que `commandes` est activé pour Realtime
- ✅ Vérifier que `restaurants` est activé pour Realtime

## 📝 Notes de Test

Date de test : _______________
Testeur : _______________
Version iOS : _______________
Version app : _______________

### Problèmes rencontrés :
1. 
2. 
3. 

### Solutions appliquées :
1. 
2. 
3. 

