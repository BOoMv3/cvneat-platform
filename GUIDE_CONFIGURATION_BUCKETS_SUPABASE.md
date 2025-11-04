# 📦 Guide : Configuration des buckets Supabase pour l'upload d'images

Ce guide vous explique comment créer les buckets Supabase nécessaires pour permettre l'upload d'images directement depuis les fichiers.

## 🎯 Buckets nécessaires

Vous devez créer les buckets suivants dans Supabase Storage :

1. **`MENU-IMAGES`** - Pour les images des plats/menus
2. **`RESTAURANTS-IMAGES`** - Pour les images des restaurants (photo de profil et bannière)
3. **`PUBLICITÉ-IMAGES`** - Pour les images des publicités

**Note importante** : Les noms des buckets sont sensibles à la casse. Utilisez exactement ces noms en majuscules avec les tirets.

## 📝 Étapes de création

### 1. Accéder à Supabase Storage

1. Connectez-vous à votre [Tableau de bord Supabase](https://app.supabase.com)
2. Sélectionnez votre projet
3. Dans le menu de gauche, cliquez sur **Storage** (ou **Stockage**)

### 2. Créer un bucket

Pour chaque bucket à créer :

1. Cliquez sur **New bucket** (ou **Nouveau bucket**)
2. Entrez le nom du bucket (ex: `menu-images`)
3. **Important** : Cochez **Public bucket** pour permettre l'accès public aux images
4. Cliquez sur **Create bucket** (ou **Créer le bucket**)

### 3. Configurer les permissions (optionnel mais recommandé)

Pour chaque bucket créé, vous pouvez configurer les permissions :

1. Cliquez sur le bucket créé
2. Allez dans l'onglet **Policies** (ou **Politiques**)
3. Créez une politique pour permettre l'upload :
   - **Policy name**: `Allow authenticated upload`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'MENU-IMAGES'::text)
     ```

4. Créez une politique pour permettre la lecture publique :
   - **Policy name**: `Allow public read`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon`, `authenticated`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'MENU-IMAGES'::text)
     ```

### 4. Répétez pour tous les buckets

Créez les trois buckets suivants avec les mêmes permissions :
- `MENU-IMAGES`
- `RESTAURANTS-IMAGES`
- `PUBLICITÉ-IMAGES`

**Important** : Utilisez exactement ces noms (majuscules avec tirets) pour que le code fonctionne correctement.

## ✅ Vérification

Pour vérifier que tout fonctionne :

1. Allez sur la page partenaire (`/partner`)
2. Essayez d'ajouter un plat avec une image
3. Sélectionnez un fichier image
4. L'upload devrait se faire automatiquement et l'URL de l'image devrait être remplie

## 🔧 Dépannage

### Erreur "Bucket not found"

Si vous obtenez une erreur "Bucket not found", vérifiez que :
- Le bucket existe bien dans Supabase Storage
- Le nom du bucket correspond exactement à celui utilisé dans le code (sensible à la casse) :
  - `MENU-IMAGES` (majuscules)
  - `RESTAURANTS-IMAGES` (majuscules, avec un S)
  - `PUBLICITÉ-IMAGES` (majuscules, avec accent)
- Le bucket est marqué comme "Public"

### Erreur "Permission denied"

Si vous obtenez une erreur de permission :
- Vérifiez que les politiques sont correctement configurées
- Assurez-vous que le bucket est public
- Vérifiez que l'utilisateur est authentifié

### Images non affichées

Si les images sont uploadées mais ne s'affichent pas :
- Vérifiez que le bucket est public
- Vérifiez les politiques de lecture (SELECT)
- Vérifiez l'URL générée dans la console du navigateur

## 📌 Note importante

Les buckets doivent être créés **avant** d'utiliser la fonctionnalité d'upload. Si les buckets n'existent pas, l'upload échouera.

Pour créer les buckets rapidement, vous pouvez utiliser l'interface Supabase ou exécuter cette commande SQL dans l'éditeur SQL :

```sql
-- Note: Cette commande doit être exécutée via l'API Supabase Admin, pas via SQL Editor
-- Les buckets doivent être créés via l'interface Storage ou l'API Storage
```

## 🚀 Alternative : Utiliser un bucket unique

Si vous préférez utiliser un seul bucket pour toutes les images :

1. Créez un bucket nommé `IMAGES` (en majuscules)
2. Modifiez le code dans `app/api/upload-image/route.js` pour utiliser toujours `IMAGES` comme bucketName
3. Les images seront organisées par dossier dans ce bucket unique

## ✅ Vérification finale

Pour vérifier que les noms de buckets correspondent :
- Allez dans Supabase Storage → Buckets
- Vérifiez que vous avez exactement :
  - `MENU-IMAGES`
  - `RESTAURANTS-IMAGES`
  - `PUBLICITÉ-IMAGES`
- Tous doivent être marqués comme "Public"

