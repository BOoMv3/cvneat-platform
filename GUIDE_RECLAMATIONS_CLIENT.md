# 📋 Guide des Réclamations - Clients

## 🎯 Comment signaler un problème après livraison

### 📍 Où trouver le bouton "Signaler un problème"

Le client peut signaler un problème de plusieurs façons :

#### 1. 📱 Page de statut de commande
- Après livraison, aller sur `/orders/[id]`
- Un message vert confirme la livraison
- Bouton orange "Signaler un problème" bien visible

#### 2. 👤 Page de profil
- Aller dans "Mon profil" → "Mes commandes"
- Pour chaque commande livrée, bouton "Signaler un problème"

#### 3. 🔔 Notifications automatiques
- Notification push après livraison avec lien direct
- Email de confirmation avec bouton de réclamation

### ⏰ Délai pour signaler un problème

- **Minimum** : 1 heure après la livraison
- **Maximum** : 48 heures après la livraison
- Après 48h, le système refuse automatiquement les réclamations

### 📝 Types de problèmes acceptés

1. **Qualité de la nourriture** - Repas froid, pas bon, etc.
2. **Problème de livraison** - Retard, mauvais comportement du livreur
3. **Articles manquants** - Produits non livrés
4. **Mauvaise commande** - Produits différents de la commande
5. **Autre** - Problème non listé

### 📸 Preuves recommandées

- Photos de la nourriture problématique
- Photos des articles manquants
- Screenshots des messages avec le livreur
- Toute preuve utile pour justifier la réclamation

### 💰 Montant de remboursement

- Le client peut demander un remboursement partiel ou total
- Le montant final est décidé par l'administrateur
- Remboursement automatique via Stripe si approuvé

### 🚫 Système anti-fraude

- Historique des réclamations du client
- Score de confiance basé sur les réclamations passées
- Signalement automatique des clients abusifs
- Refus des réclamations pour les comptes signalés

### 📊 Statuts des réclamations

1. **En attente** - Réclamation soumise, en cours de traitement
2. **En cours d'examen** - Un admin examine la réclamation
3. **Approuvée** - Remboursement accordé
4. **Rejetée** - Remboursement refusé
5. **Partiellement approuvée** - Remboursement partiel

### 🔄 Processus de traitement

1. **Client** soumet la réclamation avec preuves
2. **Admin** reçoit notification de nouvelle réclamation
3. **Admin** examine les preuves et l'historique du client
4. **Admin** approuve/rejette et définit le montant
5. **Système** envoie notification au client
6. **Remboursement** automatique si approuvé

### 📞 Contact support

Si le client a des questions :
- Email : contact@cvneat.fr
- Téléphone : [numéro de support]
- Chat en ligne sur le site

### 🎯 Points d'amélioration continue

- Temps de traitement des réclamations
- Satisfaction client
- Réduction des réclamations légitimes
- Amélioration de la qualité des restaurants partenaires

---

## 🛠️ Pour les administrateurs

### 📊 Dashboard de gestion
- Accès : `/admin/complaints`
- Filtres par statut, type, date
- Recherche par client ou numéro de commande
- Actions : approuver, rejeter, remboursement partiel

### 🔍 Informations affichées
- Détails de la réclamation
- Historique du client
- Score de confiance
- Preuves jointes
- Détails de la commande

### ⚠️ Alertes automatiques
- Nouvelle réclamation
- Client signalé pour abus
- Réclamation urgente (proche de l'expiration 48h)
