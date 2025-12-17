# 📸 Guide : Uploader la bannière "LA BONNE PÂTE"

## Option 1 : Via le Dashboard Partenaire (Recommandé) ⭐

1. **Connectez-vous** au dashboard partenaire : `/partner`
2. Allez dans **Paramètres** (ou `/partner/settings`)
3. Dans la section **"Bannière du restaurant"** :
   - Cliquez sur **"Choisir un fichier"**
   - Sélectionnez votre image de bannière "LA BONNE PÂTE"
   - L'image sera automatiquement uploadée et mise à jour

## Option 2 : Via SQL (Si vous avez l'URL de l'image)

Si vous avez déjà hébergé l'image ailleurs (ImgBB, Cloudinary, etc.) :

1. **Obtenez l'URL** de votre image
2. **Ouvrez** le fichier `scripts/update-la-bonne-pate-banner.sql`
3. **Remplacez** `VOTRE_URL_IMAGE_ICI` par votre URL réelle
4. **Exécutez** le script dans le SQL Editor de Supabase

### Exemple :
```sql
UPDATE restaurants
SET banner_image = 'https://exemple.com/banniere-la-bonne-pate.jpg',
    updated_at = NOW()
WHERE id = 'd6725fe6-59ec-413a-b39b-ddb960824999';
```

## Option 3 : Héberger l'image sur ImgBB (Gratuit)

1. Allez sur [ImgBB](https://imgbb.com/)
2. **Uploadez** votre image de bannière
3. **Copiez** l'URL directe de l'image (format : `https://i.ibb.co/...`)
4. Utilisez cette URL dans le script SQL de l'**Option 2**

## ⚠️ Notes importantes

- L'image sera affichée avec `object-contain` pour "La Bonne Pâte" afin que les néons restent visibles comme bordures
- Les dimensions recommandées : **1200x400px** ou similaire (format large)
- Format supporté : JPG, PNG, WebP
- Taille maximale : 5MB

## ✅ Vérification

Après l'upload, vérifiez que la bannière s'affiche correctement :
- Sur la page d'accueil (`/`)
- Sur la page du restaurant (`/restaurants/[id]`)

Les néons doivent apparaître comme des bordures autour de l'image !

