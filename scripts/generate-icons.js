const fs = require('fs');
const path = require('path');

// Ce script génère les icônes manquantes à partir de l'icône 16x16 existante
// Nécessite: npm install sharp (ou utiliser ImageMagick/autre outil)

console.log('🖼️  Génération des icônes manquantes...');

const publicDir = path.join(__dirname, '..', 'public');
const icon16Path = path.join(publicDir, 'icon-16x16.png');

// Vérifier si sharp est disponible
let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('❌ Erreur: Le package "sharp" n\'est pas installé.');
  console.log('📦 Installez-le avec: npm install sharp');
  console.log('\n💡 Alternative: Utilisez un outil en ligne comme:');
  console.log('   - https://realfavicongenerator.net/');
  console.log('   - https://www.favicon-generator.org/');
  console.log('   - https://favicon.io/');
  console.log('\n📝 Ou utilisez ImageMagick:');
  console.log('   convert icon-16x16.png -resize 32x32 icon-32x32.png');
  console.log('   convert icon-16x16.png -resize 192x192 icon-192x192.png');
  console.log('   convert icon-16x16.png -resize 512x512 icon-512x512.png');
  process.exit(1);
}

// Tailles d'icônes à générer
const sizes = [
  { size: 32, filename: 'icon-32x32.png' },
  { size: 192, filename: 'icon-192x192.png' },
  { size: 512, filename: 'icon-512x512.png' }
];

async function generateIcons() {
  if (!fs.existsSync(icon16Path)) {
    console.error(`❌ Erreur: ${icon16Path} n'existe pas!`);
    process.exit(1);
  }

  for (const { size, filename } of sizes) {
    const outputPath = path.join(publicDir, filename);
    
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️  ${filename} existe déjà, ignoré.`);
      continue;
    }

    try {
      await sharp(icon16Path)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(outputPath);
      
      console.log(`✅ ${filename} généré (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de ${filename}:`, error.message);
    }
  }

  // Générer og-image.jpg (1200x630) pour Open Graph
  const ogImagePath = path.join(publicDir, 'og-image.jpg');
  if (!fs.existsSync(ogImagePath)) {
    try {
      // Créer une image 1200x630 avec le logo au centre
      await sharp(icon16Path)
        .resize(400, 400, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .extend({
          top: 115,
          bottom: 115,
          left: 400,
          right: 400,
          background: { r: 234, g: 88, b: 12, alpha: 1 } // Orange CVN'EAT
        })
        .jpeg({ quality: 90 })
        .toFile(ogImagePath);
      
      console.log(`✅ og-image.jpg généré (1200x630)`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de og-image.jpg:`, error.message);
    }
  } else {
    console.log(`⏭️  og-image.jpg existe déjà, ignoré.`);
  }

  console.log('\n✨ Génération terminée!');
}

generateIcons().catch(console.error);

