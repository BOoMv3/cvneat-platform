# 🧪 Guide de Tests Manuels - CVN'Eat

Ce guide vous permet de tester manuellement tous les aspects du système.

## 📋 Prérequis

1. ✅ Serveur de développement lancé (`npm run dev`)
2. ✅ Base de données Supabase configurée et accessible
3. ✅ Variables d'environnement configurées
4. ✅ Comptes de test créés :
   - 1 compte Client
   - 1 compte Restaurant
   - 1 compte Livreur

---

## 🔄 TEST 1: Flux Complet Client → Restaurant → Livreur

### Étape 1.1: Création de commande (Client)

1. **Se connecter en tant que Client**
2. **Aller sur la page d'accueil** → Sélectionner un restaurant
3. **Ajouter des articles au panier**
4. **Procéder au checkout**
5. **Remplir les informations de livraison** :
   - Adresse: "123 Rue Test, Ganges"
   - Code postal: "34190"
   - Instructions: "Appeler avant d'arriver"
6. **Valider la commande**

**✅ Résultat attendu** :
- Commande créée avec succès
- Statut initial : `en_attente`
- Page de confirmation affichée avec le numéro de commande
- Notification "Commande créée" visible

### Étape 1.2: Restaurant voit la commande

1. **Se connecter en tant que Restaurant**
2. **Aller sur `/restaurant/orders`**
3. **Vérifier l'affichage de la nouvelle commande**

**✅ Résultat attendu** :
- Commande visible dans la liste
- Statut : `en_attente`
- Détails complets affichés (articles, adresse, total)
- Notification/alerte visible

### Étape 1.3: Restaurant accepte la commande

1. **Cliquer sur la commande**
2. **Cliquer sur "Accepter la commande"**
3. **Entrer le temps de préparation** (ex: 20 minutes)
4. **Valider**

**✅ Résultat attendu** :
- Statut passe à : `acceptee`
- Message de confirmation
- Commande mise à jour dans la liste

### Étape 1.4: Restaurant marque comme prête

1. **Une fois la préparation terminée**
2. **Cliquer sur "Marquer comme prête"**

**✅ Résultat attendu** :
- Statut passe à : `pret_a_livrer`
- Commande devient visible pour les livreurs

### Étape 1.5: Livreur voit les commandes disponibles

1. **Se connecter en tant que Livreur**
2. **Aller sur `/delivery/dashboard`**
3. **Vérifier la section "Commandes disponibles"**

**✅ Résultat attendu** :
- Commande visible dans la liste
- Statut : `pret_a_livrer`
- Informations complètes (restaurant, adresse, frais de livraison)

### Étape 1.6: Livreur accepte la commande

1. **Cliquer sur "Accepter la course"**
2. **Confirmer l'acceptation**

**✅ Résultat attendu** :
- Statut passe à : `en_livraison`
- Commande disparaît de la liste "disponibles"
- Commande visible dans "Mes commandes en cours"
- Client et restaurant notifiés

### Étape 1.7: Livreur finalise la livraison

1. **Dans "Mes commandes en cours"**
2. **Sélectionner la commande**
3. **Cliquer sur "Finaliser la livraison"**
4. **Entrer le code de sécurité** (fourni au client)
5. **Confirmer**

**✅ Résultat attendu** :
- Statut passe à : `livree`
- Client reçoit une notification
- Email de confirmation envoyé au client
- Stats du livreur mises à jour

### Étape 1.8: Vérification côté Client

1. **Revenir sur la page de suivi de commande**
2. **Vérifier le statut final**

**✅ Résultat attendu** :
- Statut : `livree`
- Notification "Commande livrée" visible
- Bouton de feedback disponible

---

## 🔍 TEST 2: Vérification des Notifications

### Test 2.1: Notifications Client

**À tester** :
- ✅ Notification lors de la création de commande
- ✅ Notification lors de l'acceptation par le restaurant
- ✅ Notification lors de la préparation
- ✅ Notification lorsque la commande est prête
- ✅ Notification lors de l'acceptation par le livreur
- ✅ Notification lors de la livraison

**Où vérifier** :
- Notifications push navigateur
- Section notifications dans le dashboard client
- Emails reçus

### Test 2.2: Notifications Restaurant

**À tester** :
- ✅ Alerte sonore lors de nouvelle commande
- ✅ Notification navigateur
- ✅ Mise à jour temps réel de la liste

### Test 2.3: Notifications Livreur

**À tester** :
- ✅ Notification SSE lors de nouvelles commandes disponibles
- ✅ Mise à jour automatique de la liste

---

## 🔒 TEST 3: Sécurité et Authentification

### Test 3.1: Protection des routes

1. **Essayer d'accéder à `/delivery/dashboard` sans être connecté**
   - ✅ Devrait rediriger vers login

2. **Essayer d'accéder en tant que Client**
   - ✅ Devrait refuser l'accès (403)

3. **Essayer d'accepter une commande sans être livreur**
   - ✅ Devrait refuser (403)

### Test 3.2: Validation des données

1. **Créer une commande avec données invalides**
   - ✅ Devrait refuser avec message d'erreur clair

2. **Essayer de changer le statut d'une commande d'un autre restaurant**
   - ✅ Devrait refuser (403)

---

## 🔄 TEST 4: Gestion des Statuts

### Test 4.1: Transitions valides

Vérifier que chaque transition fonctionne :
- ✅ `en_attente` → `acceptee` ✓
- ✅ `acceptee` → `en_preparation` ✓
- ✅ `en_preparation` → `pret_a_livrer` ✓
- ✅ `pret_a_livrer` → `en_livraison` ✓
- ✅ `en_livraison` → `livree` ✓

### Test 4.2: Transitions invalides

Vérifier que les transitions invalides sont bloquées :
- ❌ `livree` → `en_attente` (bloquée)
- ❌ `en_attente` → `livree` (bloquée)
- ❌ `refusee` → `acceptee` (bloquée)

### Test 4.3: Affichage des statuts

Vérifier l'affichage dans :
- ✅ Dashboard client
- ✅ Dashboard restaurant
- ✅ Dashboard livreur
- ✅ Page de suivi
- ✅ Notifications

---

## 🐛 TEST 5: Gestion des Erreurs

### Test 5.1: Erreurs réseau

1. **Déconnecter internet**
2. **Essayer de créer une commande**
   - ✅ Message d'erreur clair
   - ✅ Pas de crash

### Test 5.2: Erreurs serveur

1. **Simuler une erreur 500** (via DevTools)
   - ✅ Message d'erreur utilisateur-friendly
   - ✅ Logs serveur corrects

### Test 5.3: Données manquantes

1. **Accéder à une commande inexistante**
   - ✅ Message "Commande non trouvée"
   - ✅ Redirection appropriée

---

## ⚡ TEST 6: Performance

### Test 6.1: Temps de réponse

Vérifier que :
- ✅ Création commande < 2s
- ✅ Affichage liste commandes < 1s
- ✅ Mise à jour statut < 1s

### Test 6.2: Mises à jour temps réel

Vérifier que :
- ✅ Notifications apparaissent immédiatement
- ✅ Liste se met à jour automatiquement
- ✅ Pas de polling excessif

---

## 📱 TEST 7: Compatibilité Multi-appareils

### Test 7.1: Responsive

Tester sur :
- ✅ Desktop (1920x1080)
- ✅ Tablette (768px)
- ✅ Mobile (375px)

### Test 7.2: Navigateurs

Tester sur :
- ✅ Chrome
- ✅ Firefox
- ✅ Safari
- ✅ Edge

---

## 📊 CHECKLIST FINALE

Avant de considérer le système comme 100% fonctionnel :

- [ ] ✅ Flux complet testé bout en bout
- [ ] ✅ Toutes les notifications fonctionnent
- [ ] ✅ Sécurité vérifiée (auth + permissions)
- [ ] ✅ Statuts cohérents partout
- [ ] ✅ Gestion d'erreurs appropriée
- [ ] ✅ Performance acceptable
- [ ] ✅ Responsive sur tous appareils
- [ ] ✅ Compatibilité navigateurs
- [ ] ✅ Pas de bugs critiques
- [ ] ✅ Documentation à jour

---

## 🔧 Commandes Utiles pour les Tests

```bash
# Lancer les tests automatisés
node tests/run-all-tests.js

# Tests individuels
node tests/test-statuts.js
node tests/test-api-routes.js

# Vérifier les logs
tail -f logs/app.log  # Si vous avez des logs
```

---

## 📝 Notes de Test

**Date du test** : ___________

**Testeur** : ___________

**Résultats** :
- Tests réussis : ___ / ___
- Bugs trouvés : ___
- Commentaires : 

---

**✅ Si tous les tests passent, le système est prêt pour la production !**

