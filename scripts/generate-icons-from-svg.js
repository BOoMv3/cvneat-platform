const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

console.log('🖼️  Génération des icônes PNG à partir des SVG...');

const publicDir = path.join(__dirname, '..', 'public');

// Tailles d'icônes à générer depuis les SVG
const iconSizes = [
  { size: 32, svgFile: 'icon-32x32.svg', pngFile: 'icon-32x32.png' },
  { size: 192, svgFile: 'icon-192x192.svg', pngFile: 'icon-192x192.png' },
  { size: 512, svgFile: 'icon-512x512.svg', pngFile: 'icon-512x512.png' }
];

async function generateIconsFromSVG() {
  for (const { size, svgFile, pngFile } of iconSizes) {
    const svgPath = path.join(publicDir, svgFile);
    const pngPath = path.join(publicDir, pngFile);
    
    if (!fs.existsSync(svgPath)) {
      console.log(`⚠️  ${svgFile} n'existe pas, ignoré.`);
      continue;
    }

    if (fs.existsSync(pngPath)) {
      console.log(`⏭️  ${pngFile} existe déjà, ignoré.`);
      continue;
    }

    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      
      console.log(`✅ ${pngFile} généré (${size}x${size})`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de ${pngFile}:`, error.message);
    }
  }

  // Générer og-image.jpg (1200x630) pour Open Graph
  const ogSvgPath = path.join(publicDir, 'og-image.svg');
  const ogJpgPath = path.join(publicDir, 'og-image.jpg');
  
  if (fs.existsSync(ogSvgPath) && !fs.existsSync(ogJpgPath)) {
    try {
      await sharp(ogSvgPath)
        .resize(1200, 630)
        .jpeg({ quality: 90 })
        .toFile(ogJpgPath);
      
      console.log(`✅ og-image.jpg généré (1200x630)`);
    } catch (error) {
      console.error(`❌ Erreur lors de la génération de og-image.jpg:`, error.message);
    }
  } else if (!fs.existsSync(ogSvgPath)) {
    console.log(`⚠️  og-image.svg n'existe pas, ignoré.`);
  } else {
    console.log(`⏭️  og-image.jpg existe déjà, ignoré.`);
  }

  console.log('\n✨ Génération terminée!');
}

generateIconsFromSVG().catch(console.error);

