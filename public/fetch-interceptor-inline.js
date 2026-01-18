/**
 * Intercepteur fetch inline pour Capacitor
 * Doit être chargé AVANT tout autre script
 */
(function() {
  'use strict';
  
  // Vérifier si on est dans Capacitor
  const isCapacitorProtocol = typeof window !== 'undefined' && 
    window.location && 
    (window.location.protocol === 'capacitor:' || window.location.href.startsWith('capacitor://'));
  
  // URL de base pour les API
  // IMPORTANT: cvneat.fr redirige (307) vers www.cvneat.fr.
  // Éviter les redirects en WKWebView (Capacitor) améliore la fiabilité.
  const API_BASE_URL = 'https://www.cvneat.fr';
  
  // Sauvegarder le fetch original
  const originalFetch = window.fetch;
  
  if (!isCapacitorProtocol) {
    return; // Pas dans Capacitor, on ne fait rien
  }
  
  console.log('[API Interceptor Inline] Intercepteur chargé !');
  console.log('[API Interceptor Inline] Protocol:', window.location.protocol);
  console.log('[API Interceptor Inline] Href:', window.location.href);
  
  // Intercepter tous les appels fetch
  window.fetch = function(input, init) {
    // Vérifier si c'est une URL API relative
    const isRelativeApiUrl = typeof input === 'string' && input.startsWith('/api/') && !input.startsWith('http');
    
    if (isRelativeApiUrl) {
      // Remplacer par l'URL complète du serveur
      const fullUrl = API_BASE_URL + input;
      console.log('[API Interceptor Inline] Interception:', input, '→', fullUrl);
      
      const headers = {
        'Content-Type': 'application/json',
        ...(init && init.headers || {})
      };
      
      return originalFetch(fullUrl, {
        ...init,
        headers,
        mode: 'cors',
        credentials: 'omit'
      }).then(function(response) {
        console.log('[API Interceptor Inline] Réponse reçue:', response.status, fullUrl);
        return response;
      }).catch(function(error) {
        console.error('[API Interceptor Inline] Erreur:', error);
        throw error;
      });
    }
    
    // Sinon, utiliser le fetch original
    return originalFetch(input, init);
  };
  
  console.log('[API Interceptor Inline] Fetch intercepté avec succès !');
})();

