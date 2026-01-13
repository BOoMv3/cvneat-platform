#!/usr/bin/env node

/**
 * Script pour créer des fichiers HTML statiques pour les routes dynamiques /restaurants/[id]
 * Ces fichiers chargent le bundle JavaScript et laissent le routage côté client gérer la route
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'out');
const restaurantsDir = path.join(outDir, 'restaurants');

// Créer le dossier restaurants s'il n'existe pas
if (!fs.existsSync(restaurantsDir)) {
  fs.mkdirSync(restaurantsDir, { recursive: true });
}

// Lire le fichier index.html principal pour copier sa structure complète
const mainIndexPath = path.join(outDir, 'index.html');
let mainIndexContent = '';

if (fs.existsSync(mainIndexPath)) {
  mainIndexContent = fs.readFileSync(mainIndexPath, 'utf8');
} else {
  console.error('❌ Fichier index.html principal non trouvé');
  process.exit(1);
}

// Créer un fichier index.html pour /restaurants
const restaurantsIndexHtml = mainIndexContent.replace(
  /<title>[^<]*<\/title>/,
  '<title>Restaurants - CVN\'EAT</title>'
);

// Créer un fichier [id]/index.html qui sera utilisé pour toutes les routes /restaurants/[id]
// Ce fichier charge le bundle Next.js et laisse le routage côté client gérer la route dynamique
const restaurantIdHtml = mainIndexContent.replace(
  /<title>[^<]*<\/title>/,
  '<title>Restaurant - CVN\'EAT</title>'
);

// Écrire les fichiers
fs.writeFileSync(path.join(restaurantsDir, 'index.html'), restaurantsIndexHtml);

// Créer un dossier [id] pour la route dynamique
const idDir = path.join(restaurantsDir, '[id]');
if (!fs.existsSync(idDir)) {
  fs.mkdirSync(idDir, { recursive: true });
}
fs.writeFileSync(path.join(idDir, 'index.html'), restaurantIdHtml);

console.log('✅ Fichiers HTML créés pour les routes restaurants');
console.log('   - restaurants/index.html');
console.log('   - restaurants/[id]/index.html');
console.log('\n💡 Note: Le routage sera géré côté client par Next.js');
console.log('   Le composant RestaurantDetail sera chargé depuis le bundle JavaScript');
