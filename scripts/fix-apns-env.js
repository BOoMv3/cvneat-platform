/**
 * Script pour corriger APNS_KEY_CONTENT dans .env.local
 * Met le contenu multi-ligne sur une seule ligne avec \n
 */

const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé');
  process.exit(1);
}

// Lire le fichier
let content = fs.readFileSync(envPath, 'utf8');
const lines = content.split('\n');

let newLines = [];
let inApnsKey = false;
let apnsKeyParts = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.startsWith('APNS_KEY_CONTENT=')) {
    inApnsKey = true;
    // Prendre ce qui est après le =
    const afterEqual = line.substring('APNS_KEY_CONTENT='.length);
    apnsKeyParts.push(afterEqual);
    continue;
  }
  
  if (inApnsKey) {
    // Si on rencontre une ligne vide ou une nouvelle variable (commence par une lettre suivie de =)
    if (line.trim() === '' || /^[A-Z_]+=/.test(line)) {
      // Fin de APNS_KEY_CONTENT, mettre tout sur une ligne avec \n
      const fullContent = apnsKeyParts.join('\n');
      // Échapper les retours à la ligne et les guillemets
      const escaped = fullContent.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
      newLines.push(`APNS_KEY_CONTENT=${escaped}`);
      inApnsKey = false;
      if (line.trim() !== '') {
        newLines.push(line);
      }
    } else {
      // Continuer à accumuler
      apnsKeyParts.push(line);
    }
  } else {
    newLines.push(line);
  }
}

// Si on est encore dans APNS_KEY_CONTENT à la fin
if (inApnsKey) {
  const fullContent = apnsKeyParts.join('\n');
  const escaped = fullContent.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/"/g, '\\"');
  newLines.push(`APNS_KEY_CONTENT=${escaped}`);
}

// Écrire le nouveau contenu
fs.writeFileSync(envPath, newLines.join('\n'), 'utf8');
console.log('✅ Fichier .env.local corrigé !');
console.log('   APNS_KEY_CONTENT est maintenant sur une seule ligne avec \\n');

