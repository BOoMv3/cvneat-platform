/**
 * Script pour obtenir la valeur de APNS_KEY_CONTENT formatée pour Vercel
 * Usage: node scripts/get-apns-key-for-vercel.js
 */

require('dotenv').config({ path: '.env.local' });

const keyContent = process.env.APNS_KEY_CONTENT;

if (!keyContent) {
  console.error('❌ APNS_KEY_CONTENT non trouvé dans .env.local');
  process.exit(1);
}

// La valeur est déjà sur une ligne avec \n, parfait pour Vercel
console.log('\n📋 Valeur à copier dans Vercel pour APNS_KEY_CONTENT :\n');
console.log('─'.repeat(80));
console.log(keyContent);
console.log('─'.repeat(80));
console.log('\n✅ Copiez cette valeur complète dans Vercel → Settings → Environment Variables → APNS_KEY_CONTENT\n');

