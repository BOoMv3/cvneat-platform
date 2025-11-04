# 🔧 Comment configurer la clé API Google Places dans Vercel

## Étape 1 : Obtenir une clé API Google Places

### 1. Créer un projet Google Cloud
1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Donnez un nom à votre projet (ex: "CVN'EAT Platform")

### 2. Activer l'API Places
1. Dans le menu latéral, allez dans **"APIs & Services" > "Library"**
2. Recherchez **"Places API"**
3. Cliquez sur **"Enable"** (Activer)

### 3. Créer une clé API
1. Allez dans **"APIs & Services" > "Credentials"**
2. Cliquez sur **"Create Credentials"** > **"API Key"**
3. Une nouvelle clé API sera générée
4. **Copiez cette clé** (vous ne pourrez plus la voir en entier après)

### 4. Configurer les restrictions (Recommandé)
1. Cliquez sur la clé API que vous venez de créer
2. Sous **"Application restrictions"** :
   - Sélectionnez **"HTTP referrers (web sites)"**
   - Ajoutez vos domaines :
     - `https://cvneat-platform.vercel.app/*`
     - `https://*.vercel.app/*` (pour les previews)
3. Sous **"API restrictions"** :
   - Sélectionnez **"Restrict key"**
   - Cochez uniquement **"Places API"**
4. Cliquez sur **"Save"**

---

## Étape 2 : Ajouter la clé API dans Vercel

### Méthode 1 : Via l'interface Vercel (Recommandée)

1. **Connectez-vous à Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Connectez-vous avec votre compte

2. **Sélectionnez votre projet**
   - Cliquez sur votre projet **"cvneat-platform"**

3. **Accédez aux paramètres**
   - Cliquez sur l'onglet **"Settings"** en haut
   - Dans le menu latéral, cliquez sur **"Environment Variables"**

4. **Ajoutez la variable d'environnement**
   - Cliquez sur **"Add New"**
   - **Name** : `GOOGLE_PLACES_API_KEY`
   - **Value** : Collez votre clé API Google (ex: `AIzaSyBxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
   - **Environment** : Sélectionnez :
     - ✅ **Production** (pour le site en ligne)
     - ✅ **Preview** (pour les previews de branches)
     - ✅ **Development** (optionnel, pour le développement local)
   - Cliquez sur **"Save"**

5. **Redéployez l'application**
   - Allez dans l'onglet **"Deployments"**
   - Cliquez sur les **3 points** (⋯) à côté du dernier déploiement
   - Cliquez sur **"Redeploy"**
   - Ou faites un nouveau commit/push pour déclencher un nouveau déploiement

---

### Méthode 2 : Via Vercel CLI

Si vous avez installé Vercel CLI :

```bash
# Se connecter à Vercel
vercel login

# Lier le projet (si pas déjà fait)
vercel link

# Ajouter la variable d'environnement
vercel env add GOOGLE_PLACES_API_KEY

# Quand demandé, entrez votre clé API
# Sélectionnez les environnements (Production, Preview, Development)

# Redéployer
vercel --prod
```

---

## Étape 3 : Vérifier la configuration

### 1. Attendre le redéploiement
- Vercel redéploie automatiquement après l'ajout d'une variable d'environnement
- Attendez quelques minutes que le déploiement se termine

### 2. Tester la fonctionnalité
1. Allez sur votre site : `https://cvneat-platform.vercel.app`
2. Connectez-vous en tant qu'admin
3. Allez dans **Admin > Restaurants**
4. Sélectionnez un restaurant
5. Dans la section **"Configuration Google Places"**, essayez de mettre à jour un Place ID
6. L'erreur devrait avoir disparu !

---

## ⚠️ Problèmes courants

### "La clé API ne fonctionne pas"
- Vérifiez que l'API Places est bien activée dans Google Cloud Console
- Vérifiez que les restrictions de domaine sont correctes
- Attendez quelques minutes après la configuration (propagation)

### "L'erreur persiste après le redéploiement"
- Assurez-vous d'avoir redéployé après avoir ajouté la variable
- Vérifiez que la variable est bien nommée `GOOGLE_PLACES_API_KEY` (sensible à la casse)
- Vérifiez que vous avez sélectionné le bon environnement (Production)

### "La clé API est visible dans le code"
- ⚠️ **Ne jamais** mettre la clé API directement dans le code source
- Utilisez toujours les variables d'environnement
- Vérifiez que `.env.local` n'est pas commit dans Git

---

## 🔒 Sécurité

### Bonnes pratiques :
1. ✅ **Restreignez la clé API** aux domaines autorisés
2. ✅ **Limitez l'API** à "Places API" uniquement
3. ✅ **Utilisez des quotas** pour éviter les abus
4. ✅ **Surveillez l'utilisation** dans Google Cloud Console
5. ✅ **Ne partagez jamais** votre clé API publiquement

### Configuration des quotas :
1. Dans Google Cloud Console, allez dans **"APIs & Services" > "Dashboard"**
2. Cliquez sur **"Places API"**
3. Allez dans l'onglet **"Quotas"**
4. Configurez des limites quotidiennes pour éviter les coûts surprises

---

## 💰 Coûts

Google Places API a un système de facturation :
- **Premiers $200 gratuits** par mois (généralement suffisant pour les petits projets)
- Ensuite : ~$0.017 par requête
- Consultez la [page de tarification](https://developers.google.com/maps/billing/understanding-cost-of-use) pour plus de détails

---

## 📝 Résumé rapide

1. ✅ Créer un projet Google Cloud
2. ✅ Activer Places API
3. ✅ Créer une clé API
4. ✅ Configurer les restrictions
5. ✅ Ajouter `GOOGLE_PLACES_API_KEY` dans Vercel
6. ✅ Redéployer l'application
7. ✅ Tester !

---

Besoin d'aide ? Consultez :
- [Documentation Vercel - Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Documentation Google Places API](https://developers.google.com/maps/documentation/places/web-service)

