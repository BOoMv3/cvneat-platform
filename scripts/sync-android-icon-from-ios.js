#!/usr/bin/env node
/**
 * Copie le logo iOS (AppIcon-1024.png) vers Android en générant
 * les tailles mipmap requises (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi)
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png');
const FALLBACK = path.join(ROOT, 'public/icon-512x512.png');
const ANDROID_RES = path.join(ROOT, 'android/app/src/main/res');

const SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

const FILES = ['ic_launcher.png', 'ic_launcher_foreground.png', 'ic_launcher_round.png'];

async function main() {
  const sourcePath = fs.existsSync(SOURCE) ? SOURCE : fs.existsSync(FALLBACK) ? FALLBACK : null;
  if (!sourcePath) {
    console.error('❌ Fichier source introuvable:', SOURCE, 'ou', FALLBACK);
    process.exit(1);
  }

  console.log('🖼️  Source:', path.basename(sourcePath));

  for (const [folder, size] of Object.entries(SIZES)) {
    const dir = path.join(ANDROID_RES, folder);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const buf = await sharp(sourcePath)
      .resize(size, size)
      .png()
      .toBuffer();

    for (const file of FILES) {
      const dest = path.join(dir, file);
      fs.writeFileSync(dest, buf);
      console.log('   ✅', folder + '/' + file, `(${size}x${size})`);
    }
  }

  console.log('\n✅ Icône Android synchronisée avec iOS');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
