/**
 * Gestionnaire de liens pour Capacitor
 * Empêche l'ouverture du navigateur et garde tout dans l'app
 */

export const initCapacitorLinkHandler = () => {
  if (typeof window === 'undefined') return;

  // Vérifier si on est dans Capacitor
  const isCapacitor = window.location?.protocol === 'capacitor:' || 
                      window.location?.href?.startsWith('capacitor://') ||
                      window.Capacitor !== undefined;

  if (!isCapacitor) return;

  console.log('[Link Handler] Gestionnaire de liens Capacitor initialisé');

  // Intercepter tous les clics sur les liens
  document.addEventListener('click', (event) => {
    const target = event.target;
    
    // Trouver le lien parent si le clic est sur un élément enfant
    const link = target.closest('a');
    
    if (!link) return;

    const href = link.getAttribute('href');
    
    // Ignorer les liens sans href ou avec href="#"
    if (!href || href === '#' || href.startsWith('javascript:')) {
      return;
    }

    // Si c'est un lien externe (http/https) qui n'est pas cvneat.fr
    if (href.startsWith('http://') || href.startsWith('https://')) {
      // Si c'est cvneat.fr, naviguer dans l'app
      if (href.includes('cvneat.fr')) {
        event.preventDefault();
        event.stopPropagation();
        
        // Extraire le chemin de l'URL
        try {
          const url = new URL(href);
          const path = url.pathname + url.search + url.hash;
          console.log('[Link Handler] Navigation interne:', path);
          
          // Utiliser Next.js router si disponible, sinon window.location
          if (window.next && window.next.router) {
            window.next.router.push(path);
          } else {
            window.location.href = path;
          }
        } catch (e) {
          console.error('[Link Handler] Erreur parsing URL:', e);
        }
        return;
      }
      
      // Pour les autres liens externes, on peut les ouvrir dans l'app ou les bloquer
      // Ici, on les bloque pour garder tout dans l'app
      console.log('[Link Handler] Lien externe bloqué:', href);
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    // Pour les liens relatifs, laisser Next.js gérer (normal)
    // Mais s'assurer qu'ils ne s'ouvrent pas dans un nouvel onglet
    if (link.target === '_blank') {
      event.preventDefault();
      event.stopPropagation();
      
      const path = href;
      console.log('[Link Handler] Lien _blank converti en navigation interne:', path);
      
      if (window.next && window.next.router) {
        window.next.router.push(path);
      } else {
        window.location.href = path;
      }
    }
  }, true); // Utiliser capture pour intercepter tôt

  // Intercepter window.open pour empêcher l'ouverture du navigateur
  const originalWindowOpen = window.open;
  window.open = function(url, target, features) {
    console.log('[Link Handler] window.open intercepté:', url);
    
    // Si c'est cvneat.fr, naviguer dans l'app
    if (url && (url.includes('cvneat.fr') || url.startsWith('/'))) {
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      
      if (window.next && window.next.router) {
        window.next.router.push(path);
      } else {
        window.location.href = path;
      }
      return null;
    }
    
    // Pour les autres URLs, bloquer l'ouverture
    console.log('[Link Handler] window.open bloqué pour:', url);
    return null;
  };

  console.log('[Link Handler] Gestionnaire de liens configuré');
};

