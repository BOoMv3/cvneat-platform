# 🌐 Guide : Publier le site sur votre nom de domaine

## 📋 Prérequis
- Un compte Vercel (déjà configuré - votre site est sur `cvneat-platform.vercel.app`)
- Un nom de domaine acheté (ex: `cvneat.com`, `cvneat.fr`, etc.)
- Accès au gestionnaire DNS de votre domaine

## 🚀 Étape 1 : Configurer le domaine dans Vercel

### 1.1 Accéder aux paramètres du projet
1. Allez sur https://vercel.com
2. Connectez-vous à votre compte
3. Sélectionnez le projet **"cvneat-platform"**
4. Cliquez sur **"Settings"** (en haut)
5. Cliquez sur **"Domains"** dans le menu de gauche

### 1.2 Ajouter votre domaine
1. Dans la section **"Domains"**, cliquez sur **"Add"** ou **"Add Domain"**
2. Entrez votre nom de domaine (ex: `cvneat.com`)
3. Cliquez sur **"Add"**

**Vercel vous donnera deux options :**
- **Option A : Domaine racine** (ex: `cvneat.com`) - Affiche le site sur le domaine principal
- **Option B : Sous-domaine** (ex: `www.cvneat.com`) - Affiche le site sur le sous-domaine www

**Recommandation :** Ajoutez les deux (`cvneat.com` et `www.cvneat.com`) pour que les deux fonctionnent.

## 🔧 Étape 2 : Configurer les DNS

### 2.1 Obtenir les enregistrements DNS de Vercel
Après avoir ajouté votre domaine, Vercel vous affichera :
- Les **enregistrements DNS** à ajouter
- Les **serveurs de noms** (Nameservers) à configurer (si vous choisissez cette option)

**Exemple d'enregistrements DNS :**
- **Type A** : `@` → `76.76.21.21`
- **Type CNAME** : `www` → `cname.vercel-dns.com.`

### 2.2 Configurer dans votre gestionnaire DNS

**Option A : Utiliser les enregistrements DNS (Recommandé)**

1. Connectez-vous à votre gestionnaire DNS (chez votre registrar de domaine)
   - Exemples : OVH, Namecheap, GoDaddy, Google Domains, etc.
2. Allez dans la section **"DNS"** ou **"Zone DNS"**
3. Ajoutez les enregistrements fournis par Vercel :

   **Pour le domaine racine (`cvneat.com`) :**
   ```
   Type: A
   Name: @ (ou laissez vide)
   Value: 76.76.21.21 (l'adresse IP fournie par Vercel)
   TTL: 3600 (ou Auto)
   ```

   **Pour le sous-domaine www (`www.cvneat.com`) :**
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com. (avec le point final)
   TTL: 3600 (ou Auto)
   ```

**Option B : Utiliser les Nameservers de Vercel (Plus simple)**

1. Vercel vous donnera des nameservers (ex: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
2. Dans votre gestionnaire DNS, allez dans **"Nameservers"** ou **"Serveurs de noms"**
3. Remplacez les nameservers actuels par ceux fournis par Vercel
4. Sauvegardez

**Note :** Cette option peut prendre 24-48h pour se propager.

## ⏱️ Étape 3 : Attendre la propagation DNS

### 3.1 Vérifier l'état dans Vercel
- Retournez dans **Vercel > Settings > Domains**
- Vous verrez l'état de votre domaine :
  - **"Valid Configuration"** ✅ = Prêt
  - **"Pending"** ⏳ = En attente de propagation
  - **"Invalid Configuration"** ❌ = Erreur de configuration

### 3.2 Temps de propagation
- **Enregistrements DNS** : 1-24 heures (généralement quelques minutes à quelques heures)
- **Nameservers** : 24-48 heures

### 3.3 Vérifier manuellement
Vous pouvez vérifier la propagation avec :
- https://dnschecker.org
- https://www.whatsmydns.net

Entrez votre domaine et vérifiez que les enregistrements correspondent à ceux de Vercel.

## ✅ Étape 4 : Vérifier la configuration

### 4.1 SSL/TLS automatique
Vercel configure automatiquement un certificat SSL gratuit (HTTPS) pour votre domaine. C'est automatique et prend quelques minutes après la validation DNS.

### 4.2 Redirection HTTPS
Vercel force automatiquement HTTPS pour tous les domaines. Vos utilisateurs seront redirigés vers `https://votre-domaine.com`.

### 4.3 Redirection www ↔ non-www
Vercel peut configurer automatiquement la redirection entre `www` et non-`www`. Vérifiez dans **Settings > Domains**.

## 🔄 Étape 5 : Mettre à jour les variables d'environnement

### 5.1 Dans Vercel Dashboard
1. Allez dans **Settings > Environment Variables**
2. Trouvez `NEXT_PUBLIC_SITE_URL`
3. Mettez à jour avec votre nouveau domaine :
   ```
   NEXT_PUBLIC_SITE_URL=https://cvneat.com
   ```
4. **Sauvegardez**

### 5.2 Redéployer
Après avoir changé les variables d'environnement :
1. Allez dans **Deployments**
2. Cliquez sur les **3 points** du dernier déploiement
3. Cliquez sur **"Redeploy"**

Ou poussez un nouveau commit pour déclencher un nouveau déploiement.

## 📝 Étape 6 : Mettre à jour Supabase (si nécessaire)

### 6.1 URLs de redirection Supabase
1. Dans **Supabase Dashboard**, allez dans **Authentication > URL Configuration**
2. Mettez à jour :
   - **Site URL** : `https://cvneat.com`
   - **Redirect URLs** : Ajoutez `https://cvneat.com/auth/callback`

### 6.2 SMTP (si configuré)
Si vous avez configuré un SMTP personnalisé, vérifiez que l'URL de redirection dans les templates d'email est correcte.

## 🧪 Tester

1. **Accédez à votre site** : `https://votre-domaine.com`
2. **Testez les fonctionnalités** :
   - Inscription
   - Connexion
   - Navigation
   - Emails de confirmation (si configuré)

## ⚠️ Problèmes courants

### Le domaine ne se propage pas
- Vérifiez que les enregistrements DNS sont corrects
- Attendez 24-48h pour les nameservers
- Vérifiez avec https://dnschecker.org

### Erreur SSL
- Vercel configure automatiquement SSL, attendez quelques minutes
- Si le problème persiste, contactez le support Vercel

### Le site ne se charge pas
- Vérifiez que le domaine est bien lié au bon projet dans Vercel
- Vérifiez les logs de déploiement dans Vercel
- Vérifiez que les enregistrements DNS sont corrects

### Les emails ne fonctionnent pas
- Vérifiez que `NEXT_PUBLIC_SITE_URL` est mis à jour
- Vérifiez les URLs de redirection dans Supabase

## 📚 Ressources

- Documentation Vercel : https://vercel.com/docs/concepts/projects/domains
- Support Vercel : https://vercel.com/support

## 💡 Astuce

Pour tester rapidement, vous pouvez aussi utiliser un sous-domaine :
- `app.cvneat.com`
- `www.cvneat.com`
- `staging.cvneat.com`

Cela fonctionne de la même manière, ajoutez simplement le sous-domaine dans Vercel et configurez un CNAME dans votre DNS.

