/**
 * Force la clé Info.plist "ITSAppUsesNonExemptEncryption" à false
 * pour éviter que App Store Connect demande des documents de chiffrement.
 *
 * (Le dossier ios/ est ignoré par git, donc on applique le patch à chaque build.)
 */

const fs = require('fs');
const path = require('path');

const infoPlistPath = path.join(__dirname, '../ios/App/App/Info.plist');

function patchInfoPlist() {
  if (!fs.existsSync(infoPlistPath)) {
    console.warn('⚠️ [patch-ios-infoplist] Info.plist non trouvé, impossible de patcher:', infoPlistPath);
    return false;
  }

  let content = fs.readFileSync(infoPlistPath, 'utf8');

  // Déjà présent ?
  if (content.includes('<key>ITSAppUsesNonExemptEncryption</key>')) {
    // Forcer la valeur à false si true
    const before = content;
    content = content.replace(
      /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<true\s*\/>/g,
      '<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>'
    );
    // Normaliser aussi les variantes <false /> etc.
    content = content.replace(
      /<key>ITSAppUsesNonExemptEncryption<\/key>\s*<false\s*\/>/g,
      '<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>'
    );

    if (content !== before) {
      fs.writeFileSync(infoPlistPath, content, 'utf8');
      console.log('✅ [patch-ios-infoplist] ITSAppUsesNonExemptEncryption forcé à false');
    } else {
      console.log('ℹ️ [patch-ios-infoplist] Clé déjà présente et OK');
    }
    return true;
  }

  // Insérer juste avant </dict>
  const insertion = '\n\t<key>ITSAppUsesNonExemptEncryption</key>\n\t<false/>\n';
  const idx = content.lastIndexOf('</dict>');
  if (idx === -1) {
    console.error('❌ [patch-ios-infoplist] Balise </dict> introuvable dans Info.plist');
    return false;
  }

  content = content.slice(0, idx) + insertion + content.slice(idx);
  fs.writeFileSync(infoPlistPath, content, 'utf8');
  console.log('✅ [patch-ios-infoplist] Clé ITSAppUsesNonExemptEncryption ajoutée (false)');
  return true;
}

if (require.main === module) {
  patchInfoPlist();
}

module.exports = patchInfoPlist;


