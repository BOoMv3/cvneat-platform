# Génération des icônes manquantes

Les icônes suivantes sont manquantes et doivent être créées :

- `icon-32x32.png` (32x32 pixels)
- `icon-192x192.png` (192x192 pixels)
- `icon-512x512.png` (512x512 pixels)
- `og-image.jpg` (1200x630 pixels) - Image Open Graph pour réseaux sociaux

## Option 1 : Utiliser le script Node.js

```bash
npm install sharp
node scripts/generate-icons.js
```

## Option 2 : Utiliser un outil en ligne

1. **Favicon Generator** : https://realfavicongenerator.net/
   - Uploadez `icon-16x16.png`
   - Générez toutes les tailles
   - Téléchargez et placez dans `/public`

2. **Favicon.io** : https://favicon.io/
   - Créez les différentes tailles

## Option 3 : Utiliser ImageMagick (si installé)

```bash
cd public

# Générer les icônes
convert icon-16x16.png -resize 32x32 icon-32x32.png
convert icon-16x16.png -resize 192x192 icon-192x192.png
convert icon-16x16.png -resize 512x512 icon-512x512.png

# Générer og-image.jpg (1200x630)
convert icon-16x16.png -resize 400x400 -gravity center -extent 1200x630 -background "#ea580c" og-image.jpg
```

## Option 4 : Créer manuellement

Utilisez un éditeur d'images (Photoshop, GIMP, etc.) pour :
1. Ouvrir `icon-16x16.png`
2. Redimensionner aux tailles requises
3. Exporter aux formats appropriés

Pour `og-image.jpg` :
- Créez une image 1200x630 pixels
- Placez le logo CVN'EAT au centre
- Fond orange (#ea580c) ou dégradé
- Ajoutez le texte "CVN'EAT - Livraison de repas à domicile" si souhaité

