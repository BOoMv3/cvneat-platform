#!/usr/bin/env node

/**
 * Script pour créer des fichiers HTML statiques pour TOUTES les routes dynamiques
 * Ces fichiers chargent le bundle JavaScript et forcent le routage côté client
 */

const fs = require('fs');
const path = require('path');

const outDir = path.join(process.cwd(), 'out');

// Lire le fichier index.html principal
const mainIndexPath = path.join(outDir, 'index.html');
if (!fs.existsSync(mainIndexPath)) {
  console.error('❌ Fichier index.html principal non trouvé');
  process.exit(1);
}

const mainIndexContent = fs.readFileSync(mainIndexPath, 'utf8');

// Script pour forcer le chargement du composant restaurant depuis l'URL
// Ce script s'exécute APRÈS le chargement de Next.js
const restaurantRoutingScript = `
<script>
  (function() {
    console.log('[Restaurant Route] 🚀 Script de routage chargé');
    console.log('[Restaurant Route] 📍 URL actuelle:', window.location.href);
    console.log('[Restaurant Route] 📍 Pathname:', window.location.pathname);
    
    // Fonction pour extraire l'ID et forcer le routage
    function forceRestaurantRoute() {
      // Extraire l'ID depuis l'URL
      var path = window.location.pathname;
      var match = path.match(/\\/restaurants\\/([^\\/\\?]+)/);
      
      if (match && match[1]) {
        var restaurantId = match[1];
        console.log('[Restaurant Route] ✅ ID restaurant trouvé:', restaurantId);
        
        // Attendre que Next.js soit chargé
        var attempts = 0;
        var maxAttempts = 100; // 10 secondes max
        
        var checkNextJS = setInterval(function() {
          attempts++;
          
          // Vérifier si Next.js est chargé
          if (window.next && window.next.router) {
            console.log('[Restaurant Route] ✅ Next.js router trouvé après', attempts, 'tentatives');
            clearInterval(checkNextJS);
            
            // Forcer la navigation
            try {
              console.log('[Restaurant Route] 🔄 Navigation vers /restaurants/' + restaurantId);
              window.next.router.push('/restaurants/' + restaurantId);
              
              // Si la navigation ne fonctionne pas après 2 secondes, recharger
              setTimeout(function() {
                if (window.location.pathname !== '/restaurants/' + restaurantId) {
                  console.warn('[Restaurant Route] ⚠️ Navigation échouée, rechargement...');
                  window.location.href = '/restaurants/' + restaurantId;
                }
              }, 2000);
            } catch (e) {
              console.error('[Restaurant Route] ❌ Erreur navigation:', e);
              // Fallback : recharger avec l'URL complète
              window.location.href = '/restaurants/' + restaurantId;
            }
          } else if (attempts >= maxAttempts) {
            console.warn('[Restaurant Route] ⚠️ Next.js router non trouvé après', attempts, 'tentatives');
            clearInterval(checkNextJS);
            // IMPORTANT: ne pas recharger en boucle (iOS/iPad)
            // Fallback stable: rediriger vers la page statique /restaurant-view?id=...
            console.log('[Restaurant Route] ➜ Fallback statique /restaurant-view?id=...');
            window.location.href = '/restaurant-view?id=' + encodeURIComponent(restaurantId);
          } else if (attempts % 10 === 0) {
            console.log('[Restaurant Route] ⏳ Attente Next.js...', attempts, '/', maxAttempts);
          }
        }, 100);
      } else {
        console.error('[Restaurant Route] ❌ Aucun ID restaurant trouvé dans l\'URL:', path);
      }
    }
    
    // Attendre que le DOM soit prêt
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', forceRestaurantRoute);
    } else {
      // DOM déjà prêt, mais attendre un peu pour que Next.js commence à charger
      setTimeout(forceRestaurantRoute, 100);
    }
  })();
</script>
`;

// Routes dynamiques à créer
const dynamicRoutes = [
  { 
    path: 'restaurants/[id]', 
    title: 'Restaurant - CVN\'EAT',
    script: restaurantRoutingScript
  },
  { path: 'profile', title: 'Profil - CVN\'EAT' },
  { path: 'orders/[id]', title: 'Commande - CVN\'EAT' },
  { path: 'admin/orders/[id]', title: 'Commande Admin - CVN\'EAT' },
  { path: 'admin/restaurants/[id]', title: 'Restaurant Admin - CVN\'EAT' },
  { path: 'partner/orders', title: 'Commandes - CVN\'EAT' },
  { path: 'delivery/my-orders', title: 'Mes Commandes - CVN\'EAT' },
];

console.log('📄 Création des fichiers HTML pour routes dynamiques...\n');

dynamicRoutes.forEach(route => {
  const routeParts = route.path.split('/');
  let currentDir = outDir;
  
  // Créer la structure de dossiers
  routeParts.forEach((part, index) => {
    currentDir = path.join(currentDir, part);
    
    if (!fs.existsSync(currentDir)) {
      fs.mkdirSync(currentDir, { recursive: true });
    }
    
    // Si c'est le dernier élément, créer index.html
    if (index === routeParts.length - 1) {
      let htmlContent = mainIndexContent.replace(
        /<title>[^<]*<\/title>/,
        `<title>${route.title}</title>`
      );
      
      // Ajouter le script de routage si fourni (juste avant </body>)
      if (route.script) {
        // Trouver </body> et insérer le script avant
        if (htmlContent.includes('</body>')) {
          htmlContent = htmlContent.replace('</body>', route.script + '</body>');
        } else if (htmlContent.includes('</html>')) {
          htmlContent = htmlContent.replace('</html>', route.script + '</html>');
        } else {
          // Ajouter à la fin si pas de </body> ou </html>
          htmlContent += route.script;
        }
      }
      
      fs.writeFileSync(path.join(currentDir, 'index.html'), htmlContent);
      console.log(`✅ ${route.path}/index.html créé`);
    }
  });
});

console.log('\n✅ Tous les fichiers HTML créés !');
console.log('💡 Les routes dynamiques seront gérées côté client par Next.js');
