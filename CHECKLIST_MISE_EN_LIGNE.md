# ✅ CHECKLIST - MISE EN LIGNE CVN'EAT

## 📋 ÉTAPE 1 : VÉRIFICATIONS PRÉ-DÉPLOIEMENT

### 1.1 Variables d'environnement dans Vercel
- [ ] **Supabase**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` configuré
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configuré
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` configuré (⚠️ Ne JAMAIS exposer côté client)

- [ ] **Stripe** (Production)
  - [ ] `STRIPE_SECRET_KEY` (clé de **production**, pas de test)
  - [ ] `STRIPE_PUBLISHABLE_KEY` (clé de **production**)
  - [ ] `STRIPE_WEBHOOK_SECRET` configuré (webhook production)

- [ ] **Site**
  - [ ] `NEXT_PUBLIC_SITE_URL` = `https://cvneat.fr` (ou votre domaine)
  - [ ] `NEXT_PUBLIC_MAINTENANCE_MODE` = `false` (pour désactiver le mode maintenance)

- [ ] **Images** (Optionnel mais recommandé)
  - [ ] `IMGBB_API_KEY` configuré (si vous utilisez ImgBB comme fallback)

### 1.2 Configuration Supabase
- [ ] **Buckets Storage créés et configurés**
  - [ ] `MENU-IMAGES` (politiques configurées)
  - [ ] `RESTAURANTS-IMAGES` (politiques configurées)
  - [ ] `PUBLICITE-IMAGES` (politiques configurées, **sans accent**)

- [ ] **Tables vérifiées**
  - [ ] Table `users` avec colonnes `nom`, `prenom`, `telephone`
  - [ ] Table `restaurants` avec colonnes `horaires`, `ferme_manuellement`
  - [ ] Table `commandes` avec colonnes `payment_status`, `stripe_payment_intent_id`
  - [ ] Table `details_commande` avec colonne `supplements` (JSONB)
  - [ ] Table `advertisements` avec colonnes `payment_status`, `stripe_payment_intent_id`, `status`

- [ ] **RLS (Row Level Security)**
  - [ ] Politiques vérifiées pour chaque table
  - [ ] Admin peut accéder à tout (via `SUPABASE_SERVICE_ROLE_KEY`)

- [ ] **URLs de redirection Supabase**
  - [ ] Site URL : `https://cvneat.fr`
  - [ ] Redirect URLs : `https://cvneat.fr/auth/callback`

### 1.3 Configuration Stripe
- [ ] **Compte Stripe en mode Production**
  - [ ] Compte activé et vérifié
  - [ ] Clés API de production obtenues
  - [ ] Webhook configuré pour production

- [ ] **Webhook Stripe**
  - [ ] URL webhook : `https://cvneat.fr/api/stripe/webhook`
  - [ ] Événements sélectionnés :
    - `payment_intent.succeeded`
    - `payment_intent.payment_failed`
  - [ ] Secret webhook copié dans `STRIPE_WEBHOOK_SECRET`

### 1.4 Configuration Email (Supabase)
- [ ] **SMTP configuré dans Supabase**
  - [ ] SMTP personnalisé configuré (Gmail, SendGrid, etc.)
  - [ ] OU emails Supabase activés (gratuit, limité)

- [ ] **Templates d'email**
  - [ ] Emails de confirmation d'inscription activés
  - [ ] Emails de réinitialisation de mot de passe activés

---

## 🌐 ÉTAPE 2 : CONFIGURATION DU DOMAINE

### 2.1 Dans Vercel
- [ ] Domaine ajouté dans Vercel Dashboard
- [ ] Enregistrements DNS obtenus depuis Vercel

### 2.2 Dans votre registrar (IONOS, etc.)
- [ ] Enregistrement **A** configuré pour `@` (domaine racine)
- [ ] Enregistrement **CNAME** configuré pour `www`
- [ ] OU Nameservers Vercel configurés

### 2.3 Vérification DNS
- [ ] Propagation DNS vérifiée (https://dnschecker.org)
- [ ] SSL/TLS automatique activé par Vercel (gratuit)
- [ ] Site accessible en HTTPS : `https://cvneat.fr`

### 2.4 Mise à jour des URLs
- [ ] `NEXT_PUBLIC_SITE_URL` mis à jour dans Vercel
- [ ] URLs de redirection Supabase mises à jour
- [ ] Webhook Stripe mis à jour avec le nouveau domaine

---

## 🧪 ÉTAPE 3 : TESTS FINAUX

### 3.1 Tests Client
- [ ] **Inscription client**
  - [ ] Création de compte fonctionne
  - [ ] Email de confirmation reçu (si configuré)

- [ ] **Navigation**
  - [ ] Page d'accueil charge correctement
  - [ ] Liste des restaurants s'affiche
  - [ ] Pages restaurants s'ouvrent
  - [ ] Menu des restaurants s'affiche

- [ ] **Commandes**
  - [ ] Ajout au panier fonctionne
  - [ ] Suppléments visibles et sélectionnables
  - [ ] Calcul des prix correct (avec suppléments)
  - [ ] Passage de commande fonctionne
  - [ ] Paiement Stripe fonctionne
  - [ ] Suivi de commande fonctionne

### 3.2 Tests Restaurant
- [ ] **Connexion partenaire**
  - [ ] Connexion avec compte restaurant fonctionne
  - [ ] Dashboard partenaire accessible

- [ ] **Gestion restaurant**
  - [ ] Modification des horaires fonctionne
  - [ ] Ajout/modification de plats fonctionne
  - [ ] Upload d'images fonctionne
  - [ ] Gestion des suppléments fonctionne

- [ ] **Commandes**
  - [ ] Réception des commandes fonctionne
  - [ ] Acceptation/refus de commande fonctionne
  - [ ] Notification de nouvelle commande fonctionne

### 3.3 Tests Livreur
- [ ] **Connexion livreur**
  - [ ] Connexion avec compte livreur fonctionne
  - [ ] Dashboard livreur accessible

- [ ] **Livraisons**
  - [ ] Liste des commandes disponibles fonctionne
  - [ ] Acceptation de commande fonctionne
  - [ ] Navigation vers l'adresse fonctionne
  - [ ] Marquage comme livré fonctionne

### 3.4 Tests Admin
- [ ] **Connexion admin**
  - [ ] Connexion avec compte admin fonctionne
  - [ ] Dashboard admin accessible

- [ ] **Gestion**
  - [ ] Gestion des utilisateurs fonctionne
  - [ ] Gestion des restaurants fonctionne
  - [ ] Validation de partenaires fonctionne
  - [ ] Gestion des publicités fonctionne
  - [ ] Gestion des bugs fonctionne

- [ ] **Démo commande**
  - [ ] Admin peut créer une commande comme client
  - [ ] Admin peut suivre une commande

### 3.5 Tests Paiement
- [ ] **Stripe**
  - [ ] Paiement commande fonctionne
  - [ ] Paiement publicité fonctionne
  - [ ] Webhook Stripe fonctionne (vérifier dans dashboard Stripe)
  - [ ] Remboursements fonctionnent (si besoin)

---

## 🔒 ÉTAPE 4 : SÉCURITÉ ET PERFORMANCE

### 4.1 Sécurité
- [ ] **Mode maintenance**
  - [ ] `NEXT_PUBLIC_MAINTENANCE_MODE` = `false` (désactivé en production)
  - [ ] Les admins/partenaires peuvent toujours accéder (même en maintenance)

- [ ] **Variables d'environnement**
  - [ ] Aucune clé secrète exposée côté client
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` uniquement côté serveur
  - [ ] `STRIPE_SECRET_KEY` uniquement côté serveur

- [ ] **HTTPS**
  - [ ] Site accessible uniquement en HTTPS
  - [ ] Redirection HTTP → HTTPS automatique

### 4.2 Performance
- [ ] **Images**
  - [ ] Images optimisées (Next.js Image)
  - [ ] CDN Supabase pour les uploads
  - [ ] Fallback ImgBB configuré (si nécessaire)

- [ ] **Build**
  - [ ] Build Vercel réussit sans erreurs
  - [ ] Pas d'erreurs dans les logs Vercel

---

## 📊 ÉTAPE 5 : MONITORING ET LOGS

### 5.1 Vercel
- [ ] Logs de déploiement vérifiés
- [ ] Aucune erreur critique dans les logs

### 5.2 Supabase
- [ ] Logs Supabase vérifiés
- [ ] Aucune erreur RLS ou d'authentification

### 5.3 Stripe
- [ ] Dashboard Stripe accessible
- [ ] Webhooks reçus et traités correctement

---

## 🚀 ÉTAPE 6 : DÉPLOIEMENT FINAL

### 6.1 Dernière vérification
- [ ] Tous les tests passent
- [ ] Toutes les variables d'environnement configurées
- [ ] Domaine configuré et accessible
- [ ] Mode maintenance désactivé

### 6.2 Déploiement
- [ ] Push sur `main` déclenche un déploiement automatique
- [ ] Déploiement réussi sans erreurs
- [ ] Site accessible sur le domaine personnalisé

### 6.3 Post-déploiement
- [ ] Test de bout en bout complet
- [ ] Vérification que tout fonctionne en production
- [ ] Documentation mise à jour si nécessaire

---

## 📝 ÉTAPE 7 : DOCUMENTATION ET FORMATION

### 7.1 Documentation
- [ ] Guide restaurateur disponible (`GUIDE_RESTAURATEUR_COMPLET.md`)
- [ ] Guide de configuration Stripe disponible
- [ ] Guide de déploiement disponible

### 7.2 Formation
- [ ] Partenaires formés à l'utilisation du dashboard
- [ ] Admin formé à la gestion du site
- [ ] Support client prêt (si nécessaire)

---

## ⚠️ POINTS CRITIQUES À NE PAS OUBLIER

1. **Stripe en mode Production** : Utiliser les clés de **production**, pas de test
2. **Mode maintenance** : Désactiver avant la mise en ligne (`false`)
3. **Domaine** : Mettre à jour toutes les URLs (Supabase, Stripe, etc.)
4. **Emails** : Configurer SMTP ou activer les emails Supabase
5. **Buckets Supabase** : Vérifier que les noms sont **sans accent** (PUBLICITE-IMAGES, pas PUBLICITÉ-IMAGES)
6. **Webhook Stripe** : Configurer avec le bon domaine et tester

---

## 🆘 EN CAS DE PROBLÈME

### Erreurs de déploiement
1. Vérifier les logs Vercel
2. Vérifier les variables d'environnement
3. Vérifier que le build passe en local

### Erreurs de paiement
1. Vérifier les clés Stripe (production)
2. Vérifier le webhook Stripe
3. Vérifier les logs Stripe Dashboard

### Erreurs d'authentification
1. Vérifier les URLs de redirection Supabase
2. Vérifier `NEXT_PUBLIC_SITE_URL`
3. Vérifier les politiques RLS

### Images ne s'affichent pas
1. Vérifier les buckets Supabase
2. Vérifier les politiques des buckets
3. Vérifier `IMGBB_API_KEY` si utilisé comme fallback

---

## ✅ STATUT ACTUEL

**Ce qui est fait :**
- ✅ Code fonctionnel et testé
- ✅ Accès admin complet activé
- ✅ Système de commandes opérationnel
- ✅ Intégration Stripe fonctionnelle
- ✅ Dashboard partenaire fonctionnel
- ✅ Dashboard livreur fonctionnel
- ✅ Dashboard admin fonctionnel
- ✅ Upload d'images configuré (Supabase + ImgBB)

**Ce qui reste à faire :**
- 🔲 Configuration du domaine personnalisé (`cvneat.fr`)
- 🔲 Variables d'environnement en production (Vercel)
- 🔲 Configuration Stripe en production
- 🔲 Configuration emails (SMTP Supabase)
- 🔲 Tests finaux de bout en bout
- 🔲 Désactivation du mode maintenance

---

## 📞 SUPPORT

En cas de problème, vérifier :
1. Les guides de configuration dans le projet
2. Les logs Vercel et Supabase
3. La documentation Stripe
4. Les variables d'environnement

**Bon courage pour la mise en ligne ! 🚀**

