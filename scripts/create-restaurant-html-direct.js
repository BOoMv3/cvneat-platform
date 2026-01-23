#!/usr/bin/env node

/**
 * Script pour créer un fichier HTML qui charge DIRECTEMENT le composant RestaurantDetail
 * sans passer par Next.js router
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'out');
const restaurantsDir = path.join(outDir, 'restaurants', '[id]');
const mainIndexPath = path.join(outDir, 'index.html');

if (!fs.existsSync(mainIndexPath)) {
  console.error('❌ Fichier index.html principal non trouvé');
  process.exit(1);
}

const mainIndexContent = fs.readFileSync(mainIndexPath, 'utf8');

// Créer le répertoire si nécessaire
if (!fs.existsSync(restaurantsDir)) {
  fs.mkdirSync(restaurantsDir, { recursive: true });
}

// Script qui charge directement le composant RestaurantDetail
const directLoadScript = `
<script>
  (function() {
    console.log('[Restaurant Direct Load] 🚀 Script de chargement direct chargé');
    console.log('[Restaurant Direct Load] 📍 URL actuelle:', window.location.href);
    console.log('[Restaurant Direct Load] 📍 Pathname:', window.location.pathname);
    
    // Extraire l'ID depuis l'URL
    var path = window.location.pathname;
    var match = path.match(/\\/restaurants\\/([^\\/\\?]+)/);
    
    if (!match || !match[1]) {
      console.error('[Restaurant Direct Load] ❌ Aucun ID restaurant trouvé dans l\'URL:', path);
      return;
    }
    
    var restaurantId = match[1];
    console.log('[Restaurant Direct Load] ✅ ID restaurant trouvé:', restaurantId);
    
    // Fonction pour forcer la navigation
    function forceNavigation() {
      // Attendre que Next.js soit chargé
      var attempts = 0;
      var maxAttempts = 200; // 20 secondes max
      
      var checkNextJS = setInterval(function() {
        attempts++;
        
        // Vérifier si Next.js est chargé et si le router est disponible
        if (window.next && window.next.router) {
          console.log('[Restaurant Direct Load] ✅ Next.js router trouvé après', attempts, 'tentatives');
          clearInterval(checkNextJS);
          
          // Forcer la navigation vers la route
          try {
            console.log('[Restaurant Direct Load] 🔄 Navigation vers /restaurants/' + restaurantId);
            
            // Utiliser replace pour éviter l'historique
            window.next.router.replace('/restaurants/' + restaurantId);
            
            // Vérifier après 2 secondes si la navigation a fonctionné
            setTimeout(function() {
              var currentPath = window.location.pathname;
              console.log('[Restaurant Direct Load] 📍 Chemin actuel après navigation:', currentPath);
              
              if (currentPath !== '/restaurants/' + restaurantId) {
                console.warn('[Restaurant Direct Load] ⚠️ Navigation échouée, rechargement...');
                window.location.href = '/restaurants/' + restaurantId;
              } else {
                console.log('[Restaurant Direct Load] ✅ Navigation réussie !');
              }
            }, 2000);
          } catch (e) {
            console.error('[Restaurant Direct Load] ❌ Erreur navigation:', e);
            // Fallback : recharger avec l'URL complète
            window.location.href = '/restaurants/' + restaurantId;
          }
        } else if (attempts >= maxAttempts) {
          console.warn('[Restaurant Direct Load] ⚠️ Next.js router non trouvé après', attempts, 'tentatives');
          clearInterval(checkNextJS);
          // IMPORTANT: ne pas recharger en boucle (iOS/iPad)
          // Fallback stable: rediriger vers la page statique /restaurant-view?id=...
          console.log('[Restaurant Direct Load] ➜ Fallback statique /restaurant-view?id=...');
          window.location.href = '/restaurant-view?id=' + encodeURIComponent(restaurantId);
        } else if (attempts % 20 === 0) {
          console.log('[Restaurant Direct Load] ⏳ Attente Next.js...', attempts, '/', maxAttempts);
        }
      }, 100);
    }
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceNavigation);
    } else {
      // DOM déjà prêt, mais attendre un peu pour que Next.js commence à charger
      setTimeout(forceNavigation, 100);
    }
  })();
</script>
`;

// Créer le fichier HTML avec le script
let htmlContent = mainIndexContent.replace(
  /<title>[^<]*<\/title>/,
  `<title>Restaurant - CVN'EAT</title>`
);

// Ajouter le script juste avant </body>
if (htmlContent.includes('</body>')) {
  htmlContent = htmlContent.replace('</body>', directLoadScript + '</body>');
} else if (htmlContent.includes('</html>')) {
  htmlContent = htmlContent.replace('</html>', directLoadScript + '</html>');
} else {
  htmlContent += directLoadScript;
}

const outputPath = path.join(restaurantsDir, 'index.html');
fs.writeFileSync(outputPath, htmlContent);
console.log('✅ Fichier HTML créé:', outputPath);
console.log('💡 Le script de chargement direct est injecté');

