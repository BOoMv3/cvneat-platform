#!/usr/bin/env node
/**
 * Appliquer un logo source (PNG idéalement carré) à:
 * - public/icon-16x16.png, icon-32x32.png, icon-192x192.png, icon-512x512.png
 * - ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png (+ AppIcon-512@2x.png)
 *
 * Utilise macOS `sips` (pas besoin de dépendances).
 *
 * Usage:
 *   node scripts/set-app-logo.js /chemin/vers/logo.png
 *
 * Notes:
 * - Le dossier ios/ est ignoré par git dans ce repo, mais il existe en local: on le modifie quand même.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function die(msg) {
  console.error(`❌ [set-app-logo] ${msg}`);
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  die('Chemin du logo requis. Exemple: node scripts/set-app-logo.js public/app-logo.png');
}

const logoPath = path.isAbsolute(input) ? input : path.join(process.cwd(), input);
if (!fs.existsSync(logoPath)) {
  die(`Logo introuvable: ${logoPath}`);
}

function run(cmd) {
  execSync(cmd, { stdio: 'inherit' });
}

const publicDir = path.join(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) die('Dossier public/ introuvable');

const iosIconDir = path.join(process.cwd(), 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
const hasIos = fs.existsSync(iosIconDir);

console.log('🖼️  Application du logo:', logoPath);

// Générer les icônes public/ (PWA + favicons)
const publicIcons = [
  { size: 16, file: 'icon-16x16.png' },
  { size: 32, file: 'icon-32x32.png' },
  { size: 192, file: 'icon-192x192.png' },
  { size: 512, file: 'icon-512x512.png' },
];

for (const { size, file } of publicIcons) {
  const out = path.join(publicDir, file);
  console.log(`➡️  public/${file} (${size}x${size})`);
  run(`sips -s format png "${logoPath}" --out "${out}" >/dev/null`);
  run(`sips -z ${size} ${size} "${out}" --out "${out}" >/dev/null`);
}

// Icône iOS 1024x1024 (App Store) + 512@2x
if (hasIos) {
  const ios1024 = path.join(iosIconDir, 'AppIcon-1024.png');
  const ios512x2 = path.join(iosIconDir, 'AppIcon-512@2x.png');

  console.log('🍎 iOS AppIcon (1024x1024):', ios1024);
  run(`sips -s format png "${logoPath}" --out "${ios1024}" >/dev/null`);
  run(`sips -z 1024 1024 "${ios1024}" --out "${ios1024}" >/dev/null`);

  console.log('🍎 iOS AppIcon (512@2x):', ios512x2);
  run(`sips -s format png "${logoPath}" --out "${ios512x2}" >/dev/null`);
  run(`sips -z 1024 1024 "${ios512x2}" --out "${ios512x2}" >/dev/null`);
} else {
  console.warn('⚠️  Dossier iOS AppIcon introuvable (ios/ manquant). Tu peux relancer après `npm run build:ios`.');
}

console.log('✅ Logo appliqué. Prochaine étape: `npm run build:ios` puis Archive dans Xcode.');


