# 📸 Guide : Configuration ImgBB pour l'upload d'images

Ce guide explique comment obtenir une clé API gratuite ImgBB pour l'upload d'images (solution alternative à Supabase).

## 🎯 Pourquoi ImgBB ?

ImgBB est utilisé comme **solution de secours** si Supabase Storage échoue ou n'est pas configuré. C'est un service gratuit qui permet d'uploader des images sans configuration complexe de buckets.

## 📝 Étapes pour obtenir une clé API gratuite

### 1. Créer un compte ImgBB

1. Allez sur [https://imgbb.com/](https://imgbb.com/)
2. Cliquez sur **"Sign up"** ou **"S'inscrire"** en haut à droite
3. Créez un compte (gratuit) avec votre email

### 2. Obtenir la clé API

1. Une fois connecté, allez sur [https://api.imgbb.com/](https://api.imgbb.com/)
2. Vous verrez votre clé API directement sur la page
3. **Copiez la clé API** (elle ressemble à : `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### 3. Configurer la clé API dans Vercel

1. Allez dans votre projet Vercel
2. Cliquez sur **Settings** → **Environment Variables**
3. Ajoutez une nouvelle variable :
   - **Name**: `IMGBB_API_KEY`
   - **Value**: Collez votre clé API ImgBB
   - **Environment**: Sélectionnez `Production`, `Preview`, et `Development`
4. Cliquez sur **Save**

### 4. Redéployer l'application

Après avoir ajouté la variable d'environnement, redéployez votre application :
- Vercel redéploiera automatiquement si vous avez activé le déploiement automatique
- Sinon, allez dans **Deployments** → **Redeploy**

## ✅ Comment ça fonctionne

Le système d'upload fonctionne maintenant en deux étapes :

1. **Tentative Supabase** (si configuré) :
   - Essaie d'uploader vers Supabase Storage
   - Si ça fonctionne, utilise Supabase
   
2. **Fallback ImgBB** (si Supabase échoue) :
   - Si Supabase échoue ou n'est pas configuré
   - Upload automatiquement vers ImgBB
   - Retourne l'URL de l'image ImgBB

## 🔍 Vérification

Pour vérifier que tout fonctionne :

1. Essayez d'uploader une image depuis le site
2. Regardez la console du navigateur (F12) → onglet **Console**
3. Vous verrez les logs :
   - `📦 Tentative upload Supabase vers bucket: ...`
   - Si Supabase échoue : `⚠️ Upload Supabase échoué, passage à ImgBB`
   - Si ImgBB réussit : `✅ Upload ImgBB réussi`

## ⚠️ Limitations ImgBB (gratuit)

- **Taille max**: 10 MB par image
- **Stockage**: Illimité (gratuit)
- **Durée de conservation**: Les images restent en ligne indéfiniment
- **Limite de requêtes**: 32 MB par mois (généralement suffisant)

## 💡 Avantages

- ✅ Pas de configuration de buckets
- ✅ Pas de politiques à gérer
- ✅ Gratuit et simple
- ✅ URLs publiques permanentes
- ✅ Fonctionne immédiatement

## 🔧 Variables d'environnement

Assurez-vous d'avoir ces variables dans Vercel :

```
IMGBB_API_KEY=votre_cle_api_imgbb
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase (optionnel)
SUPABASE_SERVICE_ROLE_KEY=votre_cle_supabase (optionnel)
```

Si vous n'avez pas de clé ImgBB, le système utilisera une clé par défaut (qui peut ne pas fonctionner). **Il est recommandé d'obtenir votre propre clé API gratuite.**

