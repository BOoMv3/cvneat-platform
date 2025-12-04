#!/usr/bin/env node

/**
 * Script intelligent pour builder l'application mobile
 * - Détecte automatiquement toutes les pages avec routes dynamiques
 * - Exclut temporairement ces pages du build
 * - Build Next.js en statique
 * - Restaure toutes les pages
 * - Synchronise avec Capacitor
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage du build intelligent de l\'app mobile...\n');

// Fonction pour trouver récursivement tous les dossiers avec des routes dynamiques [id] ou [param]
function findDynamicRouteDirs(dir, baseDir = dir) {
  const results = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = path.relative(baseDir, fullPath);
    
    // Ignorer les dossiers de build et node_modules
    if (item.name.startsWith('_') || item.name === 'node_modules' || item.name === '.next' || item.name === 'out') {
      continue;
    }
    
    // Détecter les routes dynamiques: [id], [param], etc.
    if (item.isDirectory() && (item.name.startsWith('[') && item.name.endsWith(']'))) {
      results.push(fullPath);
    }
    
    // Chercher récursivement
    if (item.isDirectory()) {
      try {
        results.push(...findDynamicRouteDirs(fullPath, baseDir));
      } catch (e) {
        // Ignorer les erreurs de lecture
      }
    }
  }
  
  return results;
}

// Fonction pour trouver tous les dossiers parent qui contiennent des routes dynamiques
function findParentDirsWithDynamicRoutes(dir) {
  const appDir = path.join(process.cwd(), 'app');
  const dynamicDirs = findDynamicRouteDirs(appDir);
  const parentDirs = new Set();
  
  dynamicDirs.forEach(dynamicDir => {
    let current = dynamicDir;
    while (current !== appDir && current.startsWith(appDir)) {
      const parent = path.dirname(current);
      // Ajouter le parent si c'est un dossier significatif (pas juste app/)
      if (parent !== appDir) {
        parentDirs.add(parent);
      }
      current = parent;
      // Arrêter si on atteint un dossier qui devrait être exclu (uniquement api)
      const dirName = path.basename(parent);
      if (['api'].includes(dirName)) {
        break;
      }
    }
  });
  
  return Array.from(parentDirs);
}

// Dossiers à exclure UNIQUEMENT les routes API (qui nécessitent un serveur)
// Toutes les autres pages sont incluses pour que l'app mobile soit complète et fonctionnelle
const knownDirsToExclude = [
  { name: 'api', path: 'app/api' } // Les routes API nécessitent un serveur Next.js, pas compatible avec export statique
  // Toutes les autres pages (admin, partner, delivery, profile, restaurants, orders, etc.) sont maintenant incluses
];

const backups = [];

function backupDir(fullPath, name) {
  if (fs.existsSync(fullPath)) {
    // Placer les backups hors du dossier app/ pour éviter que Next.js les trouve
    const backupBaseDir = path.join(process.cwd(), '_mobile_build_backups');
    if (!fs.existsSync(backupBaseDir)) {
      fs.mkdirSync(backupBaseDir, { recursive: true });
    }
    
    const relativePath = path.relative(path.join(process.cwd(), 'app'), fullPath);
    const backupPath = path.join(backupBaseDir, relativePath || name);
    
    // Créer le dossier parent si nécessaire
    const backupParent = path.dirname(backupPath);
    if (!fs.existsSync(backupParent)) {
      fs.mkdirSync(backupParent, { recursive: true });
    }
    
    if (fs.existsSync(backupPath)) {
      fs.rmSync(backupPath, { recursive: true, force: true });
    }
    
    // Copier au lieu de renommer pour garder la structure
    fs.cpSync(fullPath, backupPath, { recursive: true, force: true });
    fs.rmSync(fullPath, { recursive: true, force: true });
    
    backups.push({ original: fullPath, backup: backupPath, name });
    return true;
  }
  return false;
}

function restoreAll() {
  backups.forEach(({ original, backup, name }) => {
    if (fs.existsSync(backup)) {
      if (fs.existsSync(original)) {
        fs.rmSync(original, { recursive: true, force: true });
      }
      // Créer le dossier parent si nécessaire
      const parent = path.dirname(original);
      if (!fs.existsSync(parent)) {
        fs.mkdirSync(parent, { recursive: true });
      }
      // Copier depuis le backup
      fs.cpSync(backup, original, { recursive: true, force: true });
      // Nettoyer le backup
      fs.rmSync(backup, { recursive: true, force: true });
    }
  });
  // Nettoyer le dossier de backups s'il est vide
  const backupBaseDir = path.join(process.cwd(), '_mobile_build_backups');
  try {
    if (fs.existsSync(backupBaseDir)) {
      const files = fs.readdirSync(backupBaseDir);
      if (files.length === 0) {
        fs.rmdirSync(backupBaseDir);
      }
    }
  } catch (e) {
    // Ignorer les erreurs de nettoyage
  }
}

try {
  // Étape 0: Exclure les routes API et toutes les pages avec routes dynamiques
  console.log('📁 Étape 0/5: Exclusion des routes API et pages dynamiques...');
  
  // Exclure les routes API (nécessitent un serveur)
  knownDirsToExclude.forEach(({ name, path: dirPath }) => {
    const fullPath = path.join(process.cwd(), dirPath);
    if (backupDir(fullPath, name)) {
      console.log(`✅ ${name} exclu temporairement`);
    }
  });
  
  // Trouver et exclure automatiquement TOUTES les pages avec routes dynamiques
  const appDir = path.join(process.cwd(), 'app');
  const allDynamicDirs = findDynamicRouteDirs(appDir);
  
  allDynamicDirs.forEach(dynamicDir => {
    const relativePath = path.relative(appDir, dynamicDir);
    const dirName = path.basename(dynamicDir);
    const parentName = path.basename(path.dirname(dynamicDir));
    
    // Créer un nom unique pour le backup
    const backupName = `${parentName}-${dirName}`;
    
    if (backupDir(dynamicDir, backupName)) {
      console.log(`✅ ${relativePath} (route dynamique) exclu temporairement`);
    }
  });
  
  console.log('');

  // Étape 1: Builder Next.js
  console.log('📦 Étape 1/5: Build Next.js en statique...');
  process.env.BUILD_MOBILE = 'true';
  execSync('npm run build', { stdio: 'inherit', env: { ...process.env, BUILD_MOBILE: 'true' } });
  
  if (!fs.existsSync(path.join(process.cwd(), 'out'))) {
    throw new Error('❌ Le dossier "out" n\'existe pas après le build');
  }
  console.log('✅ Build Next.js terminé\n');
  
  // Étape 2: Restaurer tous les dossiers
  console.log('📁 Étape 2/5: Restauration des dossiers exclus...');
  restoreAll();
  console.log('✅ Tous les dossiers restaurés\n');

  // Étape 3: Synchroniser avec Capacitor
  console.log('🔄 Étape 3/5: Synchronisation avec Capacitor...');
  execSync('npx cap sync', { stdio: 'inherit' });
  console.log('✅ Synchronisation Capacitor terminée\n');
  
  // Étape 4: Vérifications
  console.log('✔️  Étape 4/5: Vérifications...');
  const androidAssets = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets');
  const iosAssets = path.join(process.cwd(), 'ios', 'App', 'App', 'public');
  
  if (fs.existsSync(androidAssets)) {
    console.log('✅ Android: fichiers copiés');
  }
  if (fs.existsSync(iosAssets)) {
    console.log('✅ iOS: fichiers copiés');
  }
  
  console.log('\n🎉 Build terminé avec succès!');
  console.log('\n📱 Prochaines étapes:');
  console.log('   iOS: npm run capacitor:open:ios');
  console.log('   Android: npm run capacitor:open:android');
  
} catch (error) {
  console.error('\n❌ Erreur lors du build:', error.message);
  console.log('📁 Restauration des dossiers après erreur...');
  restoreAll();
  process.exit(1);
}

