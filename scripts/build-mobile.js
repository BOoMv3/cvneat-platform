#!/usr/bin/env node

/**
 * Script pour builder l'application mobile
 * - Build Next.js en statique
 * - Synchronise avec Capacitor
 * - Prépare l'app pour Android Studio
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage du build de l\'app mobile...\n');

try {
  // Étape 1: Builder Next.js
  console.log('📦 Étape 1/3: Build Next.js en statique...');
  execSync('npm run build', { stdio: 'inherit' });
  
  // Vérifier que le dossier out existe
  if (!fs.existsSync(path.join(process.cwd(), 'out'))) {
    throw new Error('❌ Le dossier "out" n\'existe pas après le build. Vérifiez les erreurs de build.');
  }
  console.log('✅ Build Next.js terminé\n');
  
  // Étape 2: Synchroniser avec Capacitor
  console.log('🔄 Étape 2/3: Synchronisation avec Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('✅ Synchronisation Capacitor terminée\n');
  
  // Étape 3: Vérifications
  console.log('✔️  Étape 3/3: Vérifications...');
  const androidAssets = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets');
  if (fs.existsSync(androidAssets)) {
    console.log('✅ Les fichiers ont été copiés dans le projet Android');
  } else {
    console.warn('⚠️  Le dossier assets Android n\'existe pas');
  }
  
  console.log('\n🎉 Build terminé avec succès!');
  console.log('\n📱 Prochaines étapes:');
  console.log('   1. Ouvrez Android Studio: npm run capacitor:open:android');
  console.log('   2. Sélectionnez votre appareil');
  console.log('   3. Cliquez sur Run (▶️)');
  console.log('\n💡 Pour générer un APK:');
  console.log('   Build → Build Bundle(s) / APK(s) → Build APK(s)');
  
} catch (error) {
  console.error('\n❌ Erreur lors du build:', error.message);
  process.exit(1);
}

