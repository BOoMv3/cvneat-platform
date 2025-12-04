#!/usr/bin/env node

/**
 * Script pour builder l'application mobile en excluant les routes API
 * - Renomme temporairement app/api pour éviter les erreurs d'export statique
 * - Build Next.js en statique
 * - Restaure app/api
 * - Synchronise avec Capacitor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage du build de l\'app mobile (avec exclusion des routes API)...\n');

const apiDir = path.join(process.cwd(), 'app', 'api');
const apiBackupDir = path.join(process.cwd(), 'app', '_api_backup_mobile_build');
const adminDir = path.join(process.cwd(), 'app', 'admin');
const adminBackupDir = path.join(process.cwd(), 'app', '_admin_backup_mobile_build');
const partnerDir = path.join(process.cwd(), 'app', 'partner');
const partnerBackupDir = path.join(process.cwd(), 'app', '_partner_backup_mobile_build');
const restaurantDir = path.join(process.cwd(), 'app', 'restaurant');
const restaurantBackupDir = path.join(process.cwd(), 'app', '_restaurant_backup_mobile_build');

// Liste des dossiers à exclure (pages avec routes dynamiques qui ne peuvent pas être exportées statiquement)
const dirsToExclude = [
  { dir: apiDir, backup: apiBackupDir, name: 'API' },
  { dir: adminDir, backup: adminBackupDir, name: 'Admin' },
  { dir: partnerDir, backup: partnerBackupDir, name: 'Partner' },
  { dir: restaurantDir, backup: restaurantBackupDir, name: 'Restaurant' }
];

function backupAndHide(dir, backup, name) {
  if (fs.existsSync(dir)) {
    if (fs.existsSync(backup)) {
      fs.rmSync(backup, { recursive: true, force: true });
    }
    fs.renameSync(dir, backup);
    console.log(`✅ ${name} exclu temporairement du build`);
    return true;
  }
  return false;
}

function restore(dir, backup, name) {
  if (fs.existsSync(backup)) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.renameSync(backup, dir);
    console.log(`✅ ${name} restauré`);
  }
}

try {
  // Étape 0: Sauvegarder et masquer les dossiers problématiques temporairement
  console.log('📁 Étape 0/5: Exclusion temporaire des routes dynamiques...');
  dirsToExclude.forEach(({ dir, backup, name }) => {
    backupAndHide(dir, backup, name);
  });
  console.log('');

  // Étape 1: Builder Next.js avec la variable d'environnement pour l'export statique
  console.log('📦 Étape 1/5: Build Next.js en statique...');
  process.env.BUILD_MOBILE = 'true';
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, BUILD_MOBILE: 'true' } });
  
  // Vérifier que le dossier out existe
  if (!fs.existsSync(path.join(process.cwd(), 'out'))) {
    throw new Error('❌ Le dossier "out" n\'existe pas après le build. Vérifiez les erreurs de build.');
  }
  console.log('✅ Build Next.js terminé\n');
  
  // Étape 2: Restaurer tous les dossiers exclus
  console.log('📁 Étape 2/5: Restauration des dossiers exclus...');
  dirsToExclude.forEach(({ dir, backup, name }) => {
    restore(dir, backup, name);
  });
  console.log('');

  // Étape 3: Synchroniser avec Capacitor
  console.log('🔄 Étape 3/5: Synchronisation avec Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('✅ Synchronisation Capacitor terminée\n');
  
  // Étape 4: Vérifications
  console.log('✔️  Étape 4/5: Vérifications...');
  const androidAssets = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets');
  const iosAssets = path.join(process.cwd(), 'ios', 'App', 'App', 'public');
  
  if (fs.existsSync(androidAssets)) {
    console.log('✅ Les fichiers ont été copiés dans le projet Android');
  }
  if (fs.existsSync(iosAssets)) {
    console.log('✅ Les fichiers ont été copiés dans le projet iOS');
  }
  
  console.log('\n🎉 Build terminé avec succès!');
  console.log('\n📱 Prochaines étapes:');
  console.log('   iOS: npm run capacitor:open:ios');
  console.log('   Android: npm run capacitor:open:android');
  
} catch (error) {
  // Restaurer tous les dossiers en cas d'erreur
  console.error('\n❌ Erreur lors du build:', error.message);
  console.log('📁 Restauration des dossiers après erreur...');
  dirsToExclude.forEach(({ dir, backup, name }) => {
    restore(dir, backup, name);
  });
  process.exit(1);
}

