# 🔒 Guide de Sécurité CVN'EAT

## ⚠️ IMPORTANT - Clés API exposées

Si vous avez reçu une alerte GitHub concernant des secrets exposés, suivez ces étapes **IMMÉDIATEMENT** :

### 1. Révoquer la clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Trouvez la clé API exposée
3. Cliquez sur "Supprimer" ou "Régénérer"
4. Créez une nouvelle clé API
5. Ajoutez des restrictions :
   - **Restrictions d'API** : Google Maps Embed API, Maps JavaScript API
   - **Restrictions HTTP referrer** : `https://votre-domaine.vercel.app/*`

### 2. Configurer les variables d'environnement

#### Sur Vercel (Production) :
1. Allez dans votre projet Vercel
2. Settings → Environment Variables
3. Ajoutez `NEXT_PUBLIC_GOOGLE_MAPS_KEY` avec votre nouvelle clé
4. Redéployez l'application

#### En local (Développement) :
1. Copiez `env.example` vers `.env.local`
2. Remplissez toutes les variables avec vos vraies clés
3. **NE JAMAIS** committer `.env.local` dans Git

### 3. Vérifier que .gitignore est correct

Assurez-vous que votre `.gitignore` contient :
```
.env
.env.local
.env*.local
```

## 🛡️ Bonnes pratiques de sécurité

### Variables d'environnement
- ✅ Utilisez `process.env.NEXT_PUBLIC_*` pour les variables côté client
- ✅ Utilisez `process.env.*` (sans NEXT_PUBLIC) pour les secrets serveur
- ❌ Ne jamais hardcoder de clés API dans le code
- ❌ Ne jamais committer `.env` ou `.env.local`

### Clés API
- ✅ Ajoutez des restrictions sur toutes vos clés API
- ✅ Utilisez des clés différentes pour dev/prod
- ✅ Activez la facturation sur Google Cloud (pour éviter les abus)
- ✅ Surveillez l'utilisation de vos APIs

### Base de données (Supabase)
- ✅ Utilisez Row Level Security (RLS) sur toutes les tables
- ✅ Le Service Role Key doit rester côté serveur uniquement
- ✅ Validez toujours les rôles utilisateurs dans les APIs
- ❌ Ne jamais exposer le Service Role Key côté client

## 🚨 En cas de fuite de secret

1. **RÉVOQUEZ immédiatement** la clé compromise
2. Générez une nouvelle clé
3. Mettez à jour les variables d'environnement
4. Redéployez l'application
5. Vérifiez les logs pour détecter toute activité suspecte
6. Changez tous les secrets qui pourraient être liés

## 📧 Contact

En cas de découverte de vulnérabilité de sécurité, contactez immédiatement l'équipe de développement.

