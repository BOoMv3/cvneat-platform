# 🚨 Dépannage - Problème d'Accès Refusé

## ❌ Problème Actuel
- **Erreur** : Accès refusé (401) sur le tableau de bord livreur
- **Cause** : L'utilisateur `livreur@cvneat.com` n'existe pas dans la table `users`

## ✅ Solution Rapide

### 1. Exécuter le Script SQL
1. Ouvrez **Supabase SQL Editor**
2. Copiez le contenu du fichier `fix-livreur-user-table.sql`
3. Exécutez le script
4. Vérifiez que l'utilisateur est créé avec le rôle `delivery`

### 2. Vérifier la Création
Le script va :
- ✅ Créer l'utilisateur livreur avec l'ID exact de Supabase Auth
- ✅ Définir le rôle `delivery`
- ✅ Créer une commande de test disponible
- ✅ Afficher un résumé des données

### 3. Tester le Système
1. Redémarrez le serveur : `npm run dev`
2. Allez sur `http://localhost:3000/delivery`
3. Connectez-vous avec : `livreur@cvneat.com` / `password123`
4. Vérifiez que les commandes apparaissent

## 🔍 Diagnostic

### Test Rapide
Exécutez dans la console du navigateur :
```javascript
// Copiez le contenu de quick-test-delivery.js
```

### Vérifications
- [ ] Utilisateur créé dans la table `users`
- [ ] Rôle défini sur `delivery`
- [ ] Commandes disponibles avec statut `ready`
- [ ] APIs de livraison accessibles

## 🚀 Résultat Attendu

Après l'exécution du script SQL :
- ✅ Connexion livreur réussie
- ✅ Tableau de bord accessible
- ✅ Commandes disponibles affichées
- ✅ Système de livraison fonctionnel

## 📞 Support

Si le problème persiste :
1. Vérifiez les logs du serveur
2. Exécutez le script de test
3. Vérifiez les données dans Supabase

---

**Note** : Le problème vient du fait que Supabase Auth et la table `users` sont séparés. L'utilisateur existe dans Auth mais pas dans notre table personnalisée.
