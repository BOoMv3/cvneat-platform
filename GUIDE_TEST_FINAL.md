# 🧪 GUIDE DE TEST FINAL - Système de Réclamations

## 🚀 Tests à effectuer après installation

### **ÉTAPE 1 : Tests automatisés**

Exécuter le script de test complet :
```bash
# Configurer les variables d'environnement
export NEXT_PUBLIC_SUPABASE_URL="votre_url_supabase"
export SUPABASE_SERVICE_ROLE_KEY="votre_service_role_key"

# Exécuter les tests
node test-complaints-system.js
```

**Résultat attendu :** Tous les tests doivent passer ✅

### **ÉTAPE 2 : Tests manuels - Interface Client**

#### 2.1 Test du feedback positif
1. **Créer une commande test**
   - Aller sur le site
   - Passer une commande
   - Marquer comme livrée

2. **Tester le feedback**
   - Aller sur `/orders/[id]/feedback`
   - Donner 5 étoiles
   - Laisser un commentaire positif
   - Cocher "Non, tout va bien"
   - Soumettre

3. **Vérifier**
   - ✅ Message de succès affiché
   - ✅ Pas de réclamation créée

#### 2.2 Test du feedback avec problème
1. **Créer une nouvelle commande test**
2. **Tester le feedback négatif**
   - Donner 2 étoiles
   - Cocher "Oui, j'ai eu des problèmes"
   - Décrire le problème
   - Soumettre

3. **Vérifier**
   - ✅ Proposition d'aide affichée
   - ✅ Bouton "Signaler le problème" visible
   - ✅ Réclamation créée automatiquement

#### 2.3 Test de réclamation directe
1. **Aller sur `/complaint/[orderId]`**
2. **Remplir le formulaire**
   - Type de problème
   - Titre et description
   - Montant demandé
   - Upload d'images (optionnel)

3. **Vérifier**
   - ✅ Réclamation soumise
   - ✅ Email de confirmation envoyé
   - ✅ Notification créée

### **ÉTAPE 3 : Tests manuels - Interface Admin**

#### 3.1 Test du dashboard admin
1. **Aller sur `/admin/complaints`**
2. **Vérifier**
   - ✅ Page se charge sans erreur
   - ✅ Liste des réclamations affichée
   - ✅ Filtres fonctionnels
   - ✅ Recherche fonctionnelle

#### 3.2 Test de gestion des réclamations
1. **Sélectionner une réclamation**
2. **Tester les actions**
   - Approuver avec remboursement partiel
   - Approuver avec remboursement total
   - Rejeter avec raison
   - Ajouter des commentaires

3. **Vérifier**
   - ✅ Statut mis à jour
   - ✅ Email envoyé au client
   - ✅ Notification créée
   - ✅ Historique mis à jour

#### 3.3 Test des remboursements Stripe
1. **Approuver une réclamation avec remboursement**
2. **Vérifier dans Stripe Dashboard**
   - ✅ Remboursement créé
   - ✅ Montant correct
   - ✅ Métadonnées présentes

3. **Vérifier les webhooks**
   - ✅ Événement `refund.created` reçu
   - ✅ Statut mis à jour automatiquement

### **ÉTAPE 4 : Tests des notifications**

#### 4.1 Test des notifications push
1. **Activer les notifications dans le profil**
2. **Créer une commande et la marquer livrée**
3. **Vérifier**
   - ✅ Notification push reçue
   - ✅ Actions "Donner mon avis" et "Voir la commande" fonctionnelles

#### 4.2 Test des emails
1. **Vérifier la réception des emails**
   - Email de livraison
   - Email de confirmation de réclamation
   - Email de résolution de réclamation

2. **Vérifier le contenu**
   - ✅ Template HTML correct
   - ✅ Boutons d'action fonctionnels
   - ✅ Informations complètes

### **ÉTAPE 5 : Tests de sécurité**

#### 5.1 Test des politiques RLS
1. **Se connecter avec un compte utilisateur**
2. **Essayer d'accéder à `/admin/complaints`**
   - ✅ Accès refusé

3. **Essayer de voir les réclamations d'autres utilisateurs**
   - ✅ Seules ses propres réclamations visibles

#### 5.2 Test des délais de réclamation
1. **Créer une commande ancienne (plus de 48h)**
2. **Essayer de créer une réclamation**
   - ✅ Délai dépassé - réclamation refusée

#### 5.3 Test de l'anti-fraude
1. **Créer plusieurs réclamations rejetées**
2. **Vérifier**
   - ✅ Score de confiance diminué
   - ✅ Compte signalé après 3 rejets

### **ÉTAPE 6 : Tests de performance**

#### 6.1 Test de charge
1. **Créer 50 réclamations simultanément**
2. **Vérifier**
   - ✅ Système stable
   - ✅ Pas d'erreurs de base de données
   - ✅ Temps de réponse acceptable

#### 6.2 Test du cache
1. **Recharger plusieurs fois la page admin**
2. **Vérifier**
   - ✅ Chargement rapide
   - ✅ Données mises à jour

## 🎯 Critères de réussite

### ✅ **Système fonctionnel si :**
- [ ] Tous les tests automatisés passent
- [ ] Interface client intuitive et responsive
- [ ] Interface admin complète et fonctionnelle
- [ ] Notifications push et emails fonctionnels
- [ ] Remises Stripe automatiques
- [ ] Sécurité RLS respectée
- [ ] Anti-fraude opérationnel
- [ ] Performance acceptable

### ❌ **Points d'attention :**
- Erreurs dans les logs Supabase
- Emails non reçus
- Notifications push non fonctionnelles
- Erreurs Stripe
- Problèmes de permissions
- Performance dégradée

## 🆘 En cas de problème

### **Logs à vérifier :**
1. **Console navigateur** - Erreurs JavaScript
2. **Logs Supabase** - Erreurs de base de données
3. **Logs Vercel** - Erreurs serveur
4. **Logs Stripe** - Erreurs paiement
5. **Logs email service** - Erreurs envoi

### **Actions de dépannage :**
1. Vérifier les variables d'environnement
2. Vérifier les permissions Supabase
3. Vérifier la configuration Stripe
4. Vérifier les quotas email service
5. Redémarrer les services si nécessaire

## 🎉 Validation finale

**Le système est prêt pour la production si :**
- ✅ Tous les tests passent
- ✅ Aucune erreur critique
- ✅ Performance acceptable
- ✅ Sécurité validée
- ✅ Documentation complète

**Félicitations ! Votre système de réclamations est opérationnel !** 🚀
