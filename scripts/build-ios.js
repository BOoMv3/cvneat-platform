#!/usr/bin/env node

/**
 * Script pour builder l'application iOS
 * - Build Next.js en statique
 * - Synchronise avec Capacitor iOS
 * - Prépare l'app pour Xcode
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🍎 Démarrage du build de l\'app iOS...\n');

try {
  // Étape 1: Builder Next.js avec la variable d'environnement pour l'export statique
  console.log('📦 Étape 1/3: Build Next.js en statique...');
  process.env.BUILD_MOBILE = 'true';
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, BUILD_MOBILE: 'true' } });
  
  // Vérifier que le dossier out existe
  if (!fs.existsSync(path.join(process.cwd(), 'out'))) {
    throw new Error('❌ Le dossier "out" n\'existe pas après le build. Vérifiez les erreurs de build.');
  }
  console.log('✅ Build Next.js terminé\n');
  
  // Étape 2: Synchroniser avec Capacitor iOS
  console.log('🔄 Étape 2/3: Synchronisation avec Capacitor iOS...');
  execSync('npx cap sync ios', { stdio: 'inherit' });
  console.log('✅ Synchronisation Capacitor iOS terminée\n');
  
  // Étape 3: Vérifications
  console.log('✔️  Étape 3/3: Vérifications...');
  const iosAssets = path.join(process.cwd(), 'ios', 'App', 'App', 'public');
  if (fs.existsSync(iosAssets)) {
    console.log('✅ Les fichiers ont été copiés dans le projet iOS');
  } else {
    console.warn('⚠️  Le dossier assets iOS n\'existe pas encore');
    console.warn('   Lancez "npm run setup:ios" pour créer le projet iOS');
  }
  
  console.log('\n🎉 Build iOS terminé avec succès!');
  console.log('\n📱 Prochaines étapes:');
  console.log('   1. Ouvrez Xcode: npm run capacitor:open:ios');
  console.log('   2. Sélectionnez votre équipe dans Signing & Capabilities');
  console.log('   3. Sélectionnez un simulateur ou votre iPhone');
  console.log('   4. Cliquez sur Run (▶️)');
  console.log('\n💡 Pour plus d\'informations, consultez GUIDE_APP_IOS_NATIVE.md');
  
} catch (error) {
  console.error('\n❌ Erreur lors du build:', error.message);
  process.exit(1);
}




