const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const iconPath = path.join(__dirname, '../public/icon-512x512.png');
const splashDir = path.join(__dirname, '../ios/App/App/Assets.xcassets/Splash.imageset');

// Créer un splash screen blanc avec le logo centré
// Utiliser sips pour créer une image blanche et y coller le logo

console.log('🎨 Création du splash screen avec logo CVN\'EAT...');

// Créer une image blanche 2732x2732
const tempWhite = '/tmp/splash-white.png';
execSync(`sips -c 2732 2732 --setProperty format png --setProperty formatOptions normal --padToHeightWidth 2732 2732 --padColor FFFFFF ${iconPath} --out ${tempWhite}`, { stdio: 'inherit' });

// Redimensionner le logo pour qu'il fasse environ 1/4 de la largeur
const logoSize = 683; // 2732 / 4
const tempLogo = '/tmp/logo-resized.png';
execSync(`sips -z ${logoSize} ${logoSize} ${iconPath} --out ${tempLogo}`, { stdio: 'inherit' });

// Créer les différentes tailles
const sizes = [
  { size: 2732, filename: 'splash-2732x2732.png' },
  { size: 1366, filename: 'splash-2732x2732-1.png' },
  { size: 683, filename: 'splash-2732x2732-2.png' }
];

sizes.forEach(({ size, filename }) => {
  const outputPath = path.join(splashDir, filename);
  
  // Créer une image blanche de la bonne taille
  execSync(`sips -c ${size} ${size} --setProperty format png --setProperty formatOptions normal --padToHeightWidth ${size} ${size} --padColor FFFFFF ${iconPath} --out /tmp/splash-${size}.png`, { stdio: 'inherit' });
  
  // Redimensionner le logo pour cette taille
  const logoSizeForThis = size / 4;
  execSync(`sips -z ${logoSizeForThis} ${logoSizeForThis} ${iconPath} --out /tmp/logo-${size}.png`, { stdio: 'inherit' });
  
  // Pour sips, on ne peut pas facilement composer des images, donc on va juste créer une image blanche
  // et le logo sera ajouté via le storyboard ou via une autre méthode
  // Pour l'instant, créons juste une image blanche
  execSync(`sips -c ${size} ${size} --setProperty format png --setProperty formatOptions normal --padToHeightWidth ${size} ${size} --padColor FFFFFF ${iconPath} --out ${outputPath}`, { stdio: 'inherit' });
  
  console.log(`✅ ${filename} créé (${size}x${size})`);
});

console.log('✅ Splash screens créés!');
console.log('⚠️  Note: Le logo sera ajouté via le LaunchScreen.storyboard');

