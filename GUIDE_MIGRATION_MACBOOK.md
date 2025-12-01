# 🍎 Guide de Migration vers MacBook

Ce guide vous explique comment transférer complètement le projet CVN'EAT sur votre nouveau MacBook et continuer à travailler avec Cursor.

---

## 📋 Prérequis

- Un compte GitHub avec accès au dépôt
- Un compte Vercel avec accès au projet
- Toutes vos clés API (Supabase, Stripe, Resend, Firebase, etc.)

---

## 🔧 Étape 1 : Installation des outils de base

### 1.1 Installer Homebrew (gestionnaire de paquets macOS)

Ouvrez le **Terminal** sur votre MacBook et exécutez :

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Suivez les instructions à l'écran. À la fin, vous devrez peut-être ajouter Homebrew à votre PATH :

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 1.2 Installer Node.js

```bash
# Installer Node.js via Homebrew
brew install node

# Vérifier l'installation
node --version
npm --version
```

**Version recommandée :** Node.js 18.x ou 20.x

### 1.3 Vérifier Git

Git est généralement déjà installé sur macOS. Vérifiez :

```bash
git --version
```

Si ce n'est pas le cas :

```bash
brew install git
```

### 1.4 Configurer Git (si nécessaire)

```bash
git config --global user.name "Votre Nom"
git config --global user.email "votre.email@example.com"
```

---

## 📥 Étape 2 : Cloner le projet

### 2.1 Naviguer vers le dossier souhaité

```bash
# Par exemple, sur le Desktop
cd ~/Desktop

# Ou créer un dossier "Projets"
mkdir -p ~/Projets
cd ~/Projets
```

### 2.2 Cloner le dépôt GitHub

```bash
git clone https://github.com/BOoMv3/cvneat-platform.git

# Entrer dans le dossier du projet
cd cvneat-platform
```

### 2.3 Vérifier la branche

```bash
# Vérifier que vous êtes sur la branche main
git branch

# Si nécessaire, basculer sur main
git checkout main
```

---

## 📦 Étape 3 : Installer les dépendances

```bash
# Installer toutes les dépendances npm
npm install
```

Cela peut prendre quelques minutes. Attendez la fin de l'installation.

---

## 🔐 Étape 4 : Configurer les variables d'environnement

### 4.1 Créer le fichier `.env.local`

```bash
# À la racine du projet
touch .env.local
```

### 4.2 Récupérer les variables depuis Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous à votre compte
3. Sélectionnez le projet **cvneat-platform**
4. Allez dans **Settings** → **Environment Variables**
5. Copiez toutes les variables d'environnement

### 4.3 Variables d'environnement complètes

Créez le fichier `.env.local` avec toutes ces variables :

```env
# ========================================
# SUPABASE (OBLIGATOIRE)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://jxbqrvlmvnofaxbtcmsw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase
SUPABASE_SERVICE_ROLE_KEY=votre_cle_service_role_supabase

# ========================================
# STRIPE (OBLIGATOIRE pour les paiements)
# ========================================
STRIPE_SECRET_KEY=sk_live_votre_cle_secrete_stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_votre_cle_publique_stripe
STRIPE_WEBHOOK_SECRET=whsec_votre_webhook_secret

# ========================================
# EMAIL - RESEND (OBLIGATOIRE)
# ========================================
RESEND_API_KEY=re_votre_cle_resend
EMAIL_FROM=CVN'EAT <noreply@cvneat.fr>

# ========================================
# FIREBASE (Pour les notifications push)
# ========================================
FIREBASE_SERVER_KEY=votre_cle_serveur_firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=votre_project_id_firebase

# ========================================
# URL DE L'APPLICATION
# ========================================
NEXT_PUBLIC_SITE_URL=https://cvneat.fr
NEXT_PUBLIC_APP_URL=https://cvneat.fr
NEXT_PUBLIC_API_BASE_URL=https://cvneat.fr

# ========================================
# GOOGLE MAPS (Optionnel - pour les cartes)
# ========================================
NEXT_PUBLIC_GOOGLE_MAPS_KEY=votre_cle_google_maps

# ========================================
# NOTIFICATIONS PUSH (Optionnel)
# ========================================
NEXT_PUBLIC_VAPID_PUBLIC_KEY=votre_vapid_public_key
VAPID_PRIVATE_KEY=votre_vapid_private_key

# ========================================
# ENVIRONNEMENT
# ========================================
NODE_ENV=development
```

**⚠️ IMPORTANT :** Remplacez toutes les valeurs `votre_...` par vos vraies clés API.

### 4.4 Vérifier que `.env.local` est dans `.gitignore`

Le fichier `.env.local` ne doit **JAMAIS** être commité dans Git. Vérifiez que `.gitignore` contient :

```
.env
.env.local
.env*.local
```

---

## 💻 Étape 5 : Installer et configurer Cursor

### 5.1 Télécharger Cursor

1. Allez sur [cursor.sh](https://cursor.sh)
2. Cliquez sur **Download for macOS**
3. Téléchargez le fichier `.dmg`
4. Ouvrez le fichier téléchargé
5. Glissez **Cursor** dans le dossier **Applications**

### 5.2 Ouvrir Cursor

1. Ouvrez **Applications** dans le Finder
2. Double-cliquez sur **Cursor**
3. Acceptez les permissions si demandé

### 5.3 Ouvrir le projet dans Cursor

1. Dans Cursor : **File** → **Open Folder...**
2. Naviguez vers le dossier `cvneat-platform` (celui que vous avez cloné)
3. Cliquez sur **Open**

### 5.4 Configurer Cursor (optionnel)

Cursor devrait détecter automatiquement que c'est un projet Next.js. Si vous voulez configurer des extensions :

1. **Extensions recommandées :**
   - ESLint (pour le linting)
   - Prettier (pour le formatage)
   - Tailwind CSS IntelliSense (pour l'autocomplétion Tailwind)

2. **Paramètres Cursor :**
   - Cursor utilise les mêmes paramètres que VS Code
   - Vous pouvez les personnaliser dans **Preferences** → **Settings**

---

## ✅ Étape 6 : Vérifier que tout fonctionne

### 6.1 Tester le build

```bash
# Dans le Terminal, à la racine du projet
npm run build
```

Si le build réussit, vous verrez :
```
✓ Compiled successfully
```

### 6.2 Lancer le serveur de développement

```bash
npm run dev
```

Vous devriez voir :
```
- ready started server on 0.0.0.0:3000
- Local:        http://localhost:3000
```

Ouvrez votre navigateur et allez sur `http://localhost:3000` pour vérifier que le site fonctionne.

### 6.3 Tester les fonctionnalités principales

- [ ] Se connecter / S'inscrire
- [ ] Voir les restaurants
- [ ] Ajouter des articles au panier
- [ ] Calculer les frais de livraison
- [ ] Passer une commande (en mode test)

---

## 📱 Étape 7 : Configuration pour l'app mobile (optionnel)

Si vous travaillez sur l'application mobile :

### 7.1 Installer Capacitor CLI

```bash
npm install -g @capacitor/cli
```

### 7.2 Installer Android Studio (pour Android)

1. Téléchargez [Android Studio](https://developer.android.com/studio)
2. Installez-le
3. Ouvrez Android Studio et installez les SDK nécessaires

### 7.3 Installer Xcode (pour iOS - uniquement sur Mac)

1. Téléchargez Xcode depuis l'App Store
2. Installez-le (c'est volumineux, ~15GB)
3. Acceptez les licences

### 7.4 Synchroniser avec Capacitor

```bash
# Builder l'app mobile
npm run build:mobile

# Ou manuellement
npm run build
npx cap sync
```

---

## 🔍 Étape 8 : Vérifications finales

### 8.1 Vérifier les connexions

- [ ] **Supabase** : Vérifier que les données se chargent
- [ ] **Stripe** : Tester un paiement en mode test
- [ ] **Resend** : Vérifier que les emails partent (logs Vercel)
- [ ] **Firebase** : Vérifier les notifications push (si configuré)

### 8.2 Vérifier Git

```bash
# Vérifier le statut
git status

# Vérifier la connexion au dépôt distant
git remote -v
```

Vous devriez voir :
```
origin  https://github.com/BOoMv3/cvneat-platform.git (fetch)
origin  https://github.com/BOoMv3/cvneat-platform.git (push)
```

---

## 🚀 Commandes utiles

### Développement

```bash
# Lancer le serveur de développement
npm run dev

# Builder pour la production
npm run build

# Lancer le serveur de production
npm start
```

### Git

```bash
# Voir les changements
git status

# Ajouter des fichiers
git add .

# Faire un commit
git commit -m "Description des changements"

# Pousser sur GitHub
git push origin main
```

### App Mobile

```bash
# Builder l'app mobile
npm run build:mobile

# Ouvrir Android Studio
npm run capacitor:open:android

# Ouvrir Xcode
npm run capacitor:open:ios
```

---

## 🐛 Résolution de problèmes courants

### Problème : `npm install` échoue

**Solution :**
```bash
# Supprimer node_modules et package-lock.json
rm -rf node_modules package-lock.json

# Réinstaller
npm install
```

### Problème : Erreur "Module not found"

**Solution :**
```bash
# Vérifier que toutes les dépendances sont installées
npm install

# Si le problème persiste, vérifier les imports dans le code
```

### Problème : Erreur de connexion à Supabase

**Solution :**
- Vérifier que `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` sont corrects
- Vérifier votre connexion internet
- Vérifier les logs dans la console du navigateur

### Problème : Cursor ne détecte pas TypeScript/JavaScript

**Solution :**
1. Redémarrer Cursor
2. Vérifier que les extensions sont installées
3. Ouvrir un fichier `.ts` ou `.js` pour forcer la détection

### Problème : Les variables d'environnement ne sont pas chargées

**Solution :**
- Vérifier que le fichier s'appelle bien `.env.local` (avec le point au début)
- Vérifier qu'il est à la racine du projet
- Redémarrer le serveur de développement (`npm run dev`)

---

## 📝 Checklist de migration

- [ ] Homebrew installé
- [ ] Node.js installé (v18+ ou v20+)
- [ ] Git configuré
- [ ] Projet cloné depuis GitHub
- [ ] Dépendances installées (`npm install`)
- [ ] Fichier `.env.local` créé avec toutes les variables
- [ ] Variables d'environnement récupérées depuis Vercel
- [ ] Cursor installé et projet ouvert
- [ ] Build réussi (`npm run build`)
- [ ] Serveur de développement fonctionne (`npm run dev`)
- [ ] Site accessible sur `http://localhost:3000`
- [ ] Connexion Supabase fonctionne
- [ ] Git configuré et connecté au dépôt

---

## 🔗 Liens utiles

- **GitHub** : https://github.com/BOoMv3/cvneat-platform
- **Vercel** : https://vercel.com (pour récupérer les variables d'environnement)
- **Supabase** : https://supabase.com (pour vérifier les clés API)
- **Stripe** : https://dashboard.stripe.com (pour vérifier les clés API)
- **Resend** : https://resend.com (pour vérifier la clé API)
- **Firebase** : https://console.firebase.google.com (pour vérifier les clés API)

---

## 💡 Astuces

1. **Utilisez des raccourcis clavier** : Cursor supporte les mêmes raccourcis que VS Code
2. **Terminal intégré** : Utilisez le terminal intégré de Cursor (`Ctrl + `` ` ` ` ou `Cmd + `` ` ` `)
3. **Git intégré** : Cursor a une interface Git intégrée pour voir les changements
4. **Extensions** : Installez les extensions recommandées pour une meilleure expérience

---

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans le Terminal
2. Vérifiez les logs dans la console du navigateur (F12)
3. Vérifiez les logs Vercel si le problème est en production
4. Vérifiez que toutes les variables d'environnement sont correctes

---

**Bon développement sur votre nouveau MacBook ! 🚀**

