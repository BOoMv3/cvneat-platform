/**
 * Script de test pour vérifier la configuration APNs
 * Usage: node scripts/test-apns-config.js
 */

require('dotenv').config({ path: '.env.local' });

console.log('\n🔍 Vérification de la configuration APNs...\n');

// Vérifier chaque variable
const checks = {
  'APNS_KEY_ID': process.env.APNS_KEY_ID,
  'APNS_TEAM_ID': process.env.APNS_TEAM_ID,
  'APNS_BUNDLE_ID': process.env.APNS_BUNDLE_ID,
  'APNS_KEY_CONTENT': process.env.APNS_KEY_CONTENT,
};

let allGood = true;

console.log('📋 Variables d\'environnement :\n');

for (const [key, value] of Object.entries(checks)) {
  const status = value ? '✅' : '❌';
  const display = value 
    ? (key === 'APNS_KEY_CONTENT' 
        ? `${value.substring(0, 30)}... (${value.length} caractères)`
        : value)
    : 'NON DÉFINIE';
  
  console.log(`  ${status} ${key}: ${display}`);
  
  if (!value) {
    allGood = false;
  }
}

console.log('\n');

// Vérifications supplémentaires
if (checks.APNS_KEY_ID) {
  if (checks.APNS_KEY_ID.length !== 10) {
    console.log('⚠️  APNS_KEY_ID devrait faire 10 caractères');
    allGood = false;
  }
}

if (checks.APNS_TEAM_ID) {
  if (checks.APNS_TEAM_ID.length !== 10) {
    console.log('⚠️  APNS_TEAM_ID devrait faire 10 caractères');
    allGood = false;
  }
}

if (checks.APNS_BUNDLE_ID !== 'fr.cvneat.app') {
  console.log('⚠️  APNS_BUNDLE_ID devrait être "fr.cvneat.app"');
  allGood = false;
}

if (checks.APNS_KEY_CONTENT) {
  if (!checks.APNS_KEY_CONTENT.includes('-----BEGIN PRIVATE KEY-----')) {
    console.log('⚠️  APNS_KEY_CONTENT devrait contenir "-----BEGIN PRIVATE KEY-----"');
    allGood = false;
  }
  if (!checks.APNS_KEY_CONTENT.includes('-----END PRIVATE KEY-----')) {
    console.log('⚠️  APNS_KEY_CONTENT devrait contenir "-----END PRIVATE KEY-----"');
    allGood = false;
  }
}

console.log('\n');

// Test de création du provider
if (allGood) {
  console.log('🧪 Test de création du provider APNs...\n');
  
  try {
    // Tester directement avec la bibliothèque apn
    const apn = require('apn');
    
    const keyContent = process.env.APNS_KEY_CONTENT;
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    
    // Convertir les \n en vrais retours à la ligne
    const keyContentWithNewlines = keyContent.replace(/\\n/g, '\n');
    
    const provider = new apn.Provider({
      token: {
        key: Buffer.from(keyContentWithNewlines, 'utf8'),
        keyId: keyId,
        teamId: teamId
      },
      production: false // false pour développement
    });
    
    if (provider) {
      console.log('✅ Provider APNs créé avec succès !\n');
      console.log('🎉 Configuration APNs correcte !\n');
    } else {
      console.log('❌ Impossible de créer le provider APNs\n');
      allGood = false;
    }
  } catch (error) {
    console.log('❌ Erreur lors de la création du provider :');
    console.log(`   ${error.message}\n`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.split('\n')[1]}\n`);
    }
    allGood = false;
  }
} else {
  console.log('❌ Configuration incomplète. Corrigez les erreurs ci-dessus.\n');
}

// Résultat final
if (allGood) {
  console.log('✅ Tout est prêt ! Les notifications iOS devraient fonctionner.\n');
  process.exit(0);
} else {
  console.log('❌ Des corrections sont nécessaires avant de pouvoir envoyer des notifications iOS.\n');
  process.exit(1);
}

