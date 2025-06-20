# CVN'Eat - Plateforme de Livraison de Repas

## 🍕 Description

CVN'Eat est une plateforme complète de livraison de repas développée avec Next.js 14 et Supabase. Elle permet aux utilisateurs de commander des plats auprès de restaurants partenaires et de suivre leurs commandes en temps réel.

## ✨ Fonctionnalités

### 👥 Interface Utilisateur
- **Inscription/Connexion** avec Supabase Auth
- **Recherche avancée** de restaurants avec filtres
- **Panier d'achat** avec gestion des quantités
- **Processus de commande** avec validation
- **Suivi des commandes** en temps réel
- **Gestion du profil** utilisateur
- **Système d'adresses** multiples

### 🏪 Interface Restaurant
- **Tableau de bord** avec statistiques
- **Gestion des commandes** (accepter/refuser)
- **Mise à jour des statuts** en temps réel
- **Gestion des menus** et produits
- **Horaires d'ouverture** configurables

### 👨‍💼 Interface Admin
- **Dashboard** avec analytics complètes
- **Gestion des restaurants** partenaires
- **Validation des demandes** de partenariat
- **Statistiques** de vente et performance
- **Gestion des utilisateurs**

### 💳 Système de Paiement
- **Intégration Stripe** pour les paiements sécurisés
- **Gestion des intentions** de paiement
- **Confirmation automatique** des commandes
- **Support des remboursements**

### 🎯 Système de Fidélité
- **Points de fidélité** automatiques
- **Niveaux de fidélité** (Bronze, Argent, Or, Platine, Diamant)
- **Réductions** basées sur les points
- **Historique** des transactions

### 🔔 Notifications
- **Notifications push** en temps réel
- **Notifications par email** pour les commandes
- **Système de rappels** automatiques
- **Notifications personnalisées**

### 🚚 Système de Livraison
- **Calcul automatique** des frais de livraison
- **Estimation des temps** de livraison
- **Gestion des zones** de livraison
- **Suivi GPS** (préparé pour l'intégration)

### 📊 Analytics et Reporting
- **Tableaux de bord** détaillés
- **Statistiques de vente** en temps réel
- **Rapports de performance** restaurant
- **Analytics utilisateur** avancées

### 🎨 Interface Moderne
- **Mode sombre/clair** automatique
- **Design responsive** mobile-first
- **Animations fluides** et transitions
- **PWA** (Progressive Web App)
- **Support offline** basique

## 🛠️ Technologies Utilisées

### Frontend
- **Next.js 14** - Framework React
- **Tailwind CSS** - Framework CSS
- **React Icons** - Icônes
- **Stripe** - Paiements
- **PWA** - Application web progressive

### Backend
- **Supabase** - Base de données et authentification
- **PostgreSQL** - Base de données
- **Real-time** - Mises à jour en temps réel
- **Edge Functions** - API serverless

### Outils
- **ESLint** - Linting
- **Prettier** - Formatage
- **Git** - Versioning

## 🚀 Installation

### Prérequis
- Node.js 18+ 
- npm ou yarn
- Compte Supabase

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/cvneat-pages.git
cd cvneat-pages
```

2. **Installer les dépendances**
```bash
npm install
```

3. **Configuration des variables d'environnement**
Créer un fichier `.env.local` :
```env
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_clé_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_clé_service_role
STRIPE_SECRET_KEY=votre_clé_secrète_stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=votre_clé_publique_stripe
```

4. **Configuration de la base de données**
Exécuter les scripts SQL dans Supabase pour créer les tables nécessaires.

5. **Lancer le serveur de développement**
```bash
npm run dev
```

6. **Ouvrir l'application**
Visiter [http://localhost:3000](http://localhost:3000)

## 📁 Structure du Projet

```
cvneat-pages/
├── app/                    # Pages Next.js 14 (App Router)
│   ├── api/               # API Routes
│   ├── admin/             # Interface admin
│   ├── profile/           # Profil utilisateur
│   └── layout.js          # Layout principal
├── components/            # Composants React
├── contexts/              # Contextes React
├── lib/                   # Utilitaires et configurations
├── public/                # Fichiers statiques
└── styles/                # Styles CSS
```

## 🔧 Configuration

### Supabase
1. Créer un projet Supabase
2. Configurer l'authentification
3. Créer les tables nécessaires
4. Configurer les politiques RLS

### Stripe
1. Créer un compte Stripe
2. Récupérer les clés API
3. Configurer les webhooks

### PWA
1. Générer les icônes nécessaires
2. Configurer le manifeste
3. Tester l'installation

## 📊 Base de Données

### Tables Principales
- `users` - Utilisateurs
- `restaurants` - Restaurants partenaires
- `products` - Produits/menus
- `orders` - Commandes
- `order_items` - Articles de commande
- `loyalty_points` - Points de fidélité
- `notifications` - Notifications
- `restaurant_hours` - Horaires d'ouverture

## 🔐 Sécurité

- **Authentification** sécurisée avec Supabase
- **Politiques RLS** pour la protection des données
- **Validation** côté client et serveur
- **HTTPS** obligatoire en production
- **Sanitisation** des données utilisateur

## 🚀 Déploiement

### Vercel (Recommandé)
1. Connecter le repository GitHub
2. Configurer les variables d'environnement
3. Déployer automatiquement

### Autres plateformes
- **Netlify** - Support complet
- **Railway** - Déploiement simple
- **Heroku** - Support Node.js

## 📱 PWA Features

- **Installation** sur mobile/desktop
- **Mode offline** basique
- **Notifications push**
- **Splash screen** personnalisé
- **Icônes** adaptatives

## 🧪 Tests

```bash
# Tests unitaires
npm run test

# Tests d'intégration
npm run test:integration

# Tests E2E
npm run test:e2e
```

## 📈 Performance

- **Lighthouse Score** : 95+
- **Core Web Vitals** optimisés
- **Lazy loading** des images
- **Code splitting** automatique
- **Cache** intelligent

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commiter les changements
4. Pousser vers la branche
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :
- Ouvrir une issue sur GitHub
- Consulter la documentation
- Contacter l'équipe de développement

## 🔄 Changelog

### Version 1.0.0
- ✅ Interface utilisateur complète
- ✅ Interface restaurant
- ✅ Interface admin
- ✅ Système de paiement
- ✅ Notifications temps réel
- ✅ Mode sombre
- ✅ PWA
- ✅ Système de fidélité

## 🎯 Roadmap

- [ ] Intégration GPS pour les livreurs
- [ ] Système de réservation
- [ ] Chat en temps réel
- [ ] Intégration IA pour recommandations
- [ ] Support multi-langues
- [ ] API publique pour développeurs
- [ ] Application mobile native

---

**CVN'Eat** - Livraison de repas moderne et intuitive 🍕✨ 