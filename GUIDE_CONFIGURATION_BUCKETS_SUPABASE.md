# 📦 Guide : Configuration des buckets Supabase pour l'upload d'images

Ce guide vous explique comment créer les buckets Supabase nécessaires pour permettre l'upload d'images directement depuis les fichiers.

## 🎯 Buckets nécessaires

Vous devez créer les buckets suivants dans Supabase Storage :

1. **`MENU-IMAGES`** - Pour les images des plats/menus
2. **`RESTAURANTS-IMAGES`** - Pour les images des restaurants (photo de profil et bannière)
3. **`PUBLICITE-IMAGES`** - Pour les images des publicités (⚠️ SANS accent, utilisez `PUBLICITE` pas `PUBLICITÉ`)

**Note importante** : 
- Les noms des buckets sont sensibles à la casse
- Les buckets ne doivent PAS contenir d'accents ni de caractères spéciaux
- Utilisez exactement ces noms en majuscules avec les tirets

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

### 3. Configurer les permissions - MÉTHODE RAPIDE (Recommandée)

**Option A : Utiliser le fichier SQL (Plus rapide)**

1. Ouvrez le fichier `POLITIQUES_BUCKETS_SUPABASE.sql` dans votre projet
2. Copiez tout le contenu du fichier
3. Dans Supabase, allez dans **SQL Editor** (éditeur SQL)
4. Collez le contenu et cliquez sur **Run** (Exécuter)
5. Toutes les politiques seront créées automatiquement pour tous les buckets

**Option B : Créer manuellement (Si vous préférez)**

Pour chaque bucket créé, vous devez créer les politiques **individuellement** :

1. Cliquez sur le bucket (ex: `RESTAURANTS-IMAGES`)
2. Allez dans l'onglet **Policies** (ou **Politiques**)
3. Cliquez sur **Nouvelle politique** (New policy)
4. Créez une politique pour permettre l'upload :
   - **Policy name**: `Permettre upload RESTAURANTS-IMAGES authentifié`
   - **Allowed operation**: `INSERT`
   - **Target roles**: `authenticated`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'RESTAURANTS-IMAGES'::text)
     ```
5. Répétez pour créer une politique de lecture publique :
   - **Policy name**: `Permettre lecture publique RESTAURANTS-IMAGES`
   - **Allowed operation**: `SELECT`
   - **Target roles**: `anon`, `authenticated`
   - **Policy definition**: 
     ```sql
     (bucket_id = 'RESTAURANTS-IMAGES'::text)
     ```

**⚠️ IMPORTANT** : Les politiques ne peuvent pas être copiées d'un bucket à l'autre en cliquant. Vous devez créer une nouvelle politique pour chaque bucket avec le bon nom de bucket dans la définition.

### 4. Répétez pour tous les buckets

Créez les trois buckets suivants :
- `MENU-IMAGES`
- `RESTAURANTS-IMAGES`
- `PUBLICITE-IMAGES` (⚠️ **SANS accent**, pas `PUBLICITÉ`)

**Important** : 
- Utilisez exactement ces noms (majuscules avec tirets)
- Chaque bucket doit avoir ses propres politiques (ne peuvent pas être partagées)
- Utilisez le fichier SQL `POLITIQUES_BUCKETS_SUPABASE.sql` pour créer toutes les politiques d'un coup

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
  - `PUBLICITE-IMAGES` (majuscules, **SANS accent** - pas `PUBLICITÉ`)
- Le bucket est marqué comme "Public"

### Erreur "Permission denied"

Si vous obtenez une erreur de permission :
- Vérifiez que les politiques sont correctement configurées pour **chaque bucket individuellement**
- Assurez-vous que le bucket est public
- Vérifiez que l'utilisateur est authentifié
- **Utilisez le fichier SQL** `POLITIQUES_BUCKETS_SUPABASE.sql` pour créer toutes les politiques d'un coup

### Les politiques ne s'appliquent pas aux autres buckets

**Problème** : Vous avez créé des politiques pour `MENU-IMAGES` mais elles ne fonctionnent pas pour `RESTAURANTS-IMAGES` ou `PUBLICITE-IMAGES`.

**Solution** : Les politiques Supabase Storage sont spécifiques à chaque bucket. Vous ne pouvez pas copier une politique d'un bucket à l'autre en cliquant. 

**Deux options** :
1. **Méthode rapide** : Utilisez le fichier `POLITIQUES_BUCKETS_SUPABASE.sql` dans Supabase SQL Editor pour créer toutes les politiques automatiquement
2. **Méthode manuelle** : Pour chaque bucket (`RESTAURANTS-IMAGES`, `PUBLICITE-IMAGES`, `IMAGES`), créez une nouvelle politique avec le bon nom de bucket dans la définition SQL

### Erreur "Bucket name invalid"

**Problème** : Vous obtenez l'erreur "Bucket name invalid" lors de l'upload.

**Solution** : 
- Les noms de buckets Supabase ne doivent **PAS contenir d'accents** ni de caractères spéciaux
- Si vous avez créé `PUBLICITÉ-IMAGES` avec un accent, vous devez :
  1. Créer un nouveau bucket nommé `PUBLICITE-IMAGES` (sans accent)
  2. Supprimer l'ancien bucket `PUBLICITÉ-IMAGES` s'il existe
  3. Exécuter le fichier SQL `POLITIQUES_BUCKETS_SUPABASE.sql` pour créer les politiques
- Le code utilise maintenant `PUBLICITE-IMAGES` (sans accent) par défaut

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
  - `PUBLICITE-IMAGES` (⚠️ **SANS accent**, pas `PUBLICITÉ-IMAGES`)
- Tous doivent être marqués comme "Public"
- ⚠️ **Si vous avez créé `PUBLICITÉ-IMAGES` avec un accent**, vous devez soit :
  - Le renommer en `PUBLICITE-IMAGES` (sans accent)
  - Ou créer un nouveau bucket `PUBLICITE-IMAGES` et supprimer l'ancien

