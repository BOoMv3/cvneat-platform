/**
 * Intercepteur global pour rediriger les appels API vers le serveur en production
 * dans l'app mobile Capacitor
 */

// Fonction pour détecter si on est dans Capacitor
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  
  // Détecter Capacitor de plusieurs façons
  // 1. Vérifier window.Capacitor (API Capacitor)
  if (window.Capacitor) return true;
  
  // 2. Vérifier window.CapacitorWeb (ancienne version)
  if (window.CapacitorWeb) return true;
  
  // 3. Vérifier l'URL du document (capacitor://)
  if (window.location && window.location.protocol === 'capacitor:') return true;
  
  // 4. Vérifier l'URL de base (capacitor://localhost)
  if (window.location && window.location.href && window.location.href.startsWith('capacitor://')) return true;
  
  // 5. Vérifier le userAgent
  if (window.navigator && window.navigator.userAgent && window.navigator.userAgent.includes('Capacitor')) return true;
  
  // 6. Vérifier si on est dans un WebView iOS/Android (pas dans un navigateur normal)
  const isWebView = /iPhone|iPad|iPod|Android/i.test(window.navigator.userAgent) && 
                    !window.MSStream && // Exclure IE
                    !(window.navigator.standalone !== undefined); // Exclure PWA
  
  // Si on est dans un WebView et qu'on n'est pas sur http/https normal, c'est probablement Capacitor
  if (isWebView && window.location.protocol !== 'http:' && window.location.protocol !== 'https:') {
    return true;
  }
  
  return false;
};

// URL de base pour les API en production
// IMPORTANT: cvneat.fr redirige (307) vers www.cvneat.fr. Éviter les redirects en WKWebView (Capacitor).
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://www.cvneat.fr';

// Sauvegarder le fetch original
const originalFetch = typeof window !== 'undefined' ? window.fetch : null;

if (typeof window !== 'undefined' && originalFetch) {
  // Intercepter tous les appels fetch
  window.fetch = async function(input, init = {}) {
    // IMPORTANT: Ne JAMAIS intercepter les appels Supabase (supabase.co)
    // Vérifier l'URL complète ou l'objet Request
    let urlToCheck = '';
    if (typeof input === 'string') {
      urlToCheck = input;
    } else if (input instanceof Request) {
      urlToCheck = input.url;
    } else if (input && typeof input === 'object' && input.url) {
      urlToCheck = input.url;
    }
    
    // Si c'est un appel Supabase, laisser passer IMMÉDIATEMENT sans modification
    if (urlToCheck.includes('supabase.co') || urlToCheck.includes('supabase') || urlToCheck.includes('.supabase.co')) {
      return originalFetch(input, init);
    }
    
    // Vérifier si c'est une URL API relative
    const isRelativeApiUrl = typeof input === 'string' && input.startsWith('/api/') && !input.startsWith('http');
    
    // Détecter Capacitor de manière plus agressive
    const protocol = window.location?.protocol || '';
    const href = window.location?.href || '';
    const isCapacitorProtocol = protocol === 'capacitor:' || href.startsWith('capacitor://');
    const capacitor = isCapacitorProtocol || isCapacitor();
    
    // Log pour chaque appel API (mais pas pour Supabase)
    if (isRelativeApiUrl) {
      console.log(`[API Interceptor] Appel API détecté: ${input}`);
      console.log(`[API Interceptor] Protocol: ${protocol}`);
      console.log(`[API Interceptor] Href: ${href}`);
      console.log(`[API Interceptor] isCapacitorProtocol: ${isCapacitorProtocol}`);
      console.log(`[API Interceptor] capacitor: ${capacitor}`);
    }
    
    // Si c'est une URL API relative ET qu'on est dans Capacitor, on intercepte TOUJOURS
    if (isRelativeApiUrl && capacitor) {
      // Remplacer par l'URL complète du serveur
      const fullUrl = `${API_BASE_URL}${input}`;
      console.log(`[API Interceptor] Capacitor détecté: ${input} → ${fullUrl}`);
      
      // Ajouter les headers CORS si nécessaire
      const headers = {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      };
      
      try {
        const response = await originalFetch(fullUrl, {
          ...init,
          headers,
          mode: 'cors', // Important pour les appels cross-origin
          credentials: 'omit' // Ne pas envoyer les cookies pour éviter les problèmes CORS
        });
        
        console.log(`[API Interceptor] Réponse reçue: ${response.status} ${response.statusText} pour ${fullUrl}`);
        
        if (!response.ok) {
          console.error(`[API Interceptor] Erreur ${response.status}: ${response.statusText} pour ${fullUrl}`);
          // Essayer de lire le body pour plus d'infos
          try {
            const errorText = await response.clone().text();
            console.error(`[API Interceptor] Corps de l'erreur:`, errorText.substring(0, 200));
          } catch (e) {
            // Ignorer si on ne peut pas lire le body
          }
        }
        
        return response;
      } catch (error) {
        console.error(`[API Interceptor] Erreur fetch pour ${fullUrl}:`, error);
        console.error(`[API Interceptor] Type d'erreur:`, error.name, error.message);
        throw error;
      }
    }
    
    // Fallback : si on est dans Capacitor (autre méthode de détection) et que c'est une URL API
    if (isRelativeApiUrl && capacitor && !isCapacitorProtocol) {
      const fullUrl = `${API_BASE_URL}${input}`;
      console.log(`[API Interceptor] Capacitor détecté (fallback): ${input} → ${fullUrl}`);
      
      const headers = {
        'Content-Type': 'application/json',
        ...(init.headers || {})
      };
      
      try {
        const response = await originalFetch(fullUrl, {
          ...init,
          headers,
          mode: 'cors',
          credentials: 'omit'
        });
        
        console.log(`[API Interceptor] Réponse reçue: ${response.status} ${response.statusText} pour ${fullUrl}`);
        
        if (!response.ok) {
          console.error(`[API Interceptor] Erreur ${response.status}: ${response.statusText} pour ${fullUrl}`);
        }
        
        return response;
      } catch (error) {
        console.error(`[API Interceptor] Erreur fetch pour ${fullUrl}:`, error);
        throw error;
      }
    }
    
    // Sinon, utiliser le fetch original
    return originalFetch(input, init);
  };
}

// Exporter pour utilisation manuelle si nécessaire
export const getApiUrl = (path) => {
  if (isCapacitor() && path.startsWith('/api/')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
};

// Log au chargement pour vérifier que l'intercepteur est actif
if (typeof window !== 'undefined') {
  const capacitorDetected = isCapacitor();
  const protocol = window.location?.protocol || 'unknown';
  const href = window.location?.href || 'unknown';
  
  console.log('[API Interceptor] ============================================');
  console.log('[API Interceptor] Intercepteur chargé !');
  console.log('[API Interceptor] Capacitor détecté:', capacitorDetected);
  console.log('[API Interceptor] Protocol:', protocol);
  console.log('[API Interceptor] Href:', href);
  console.log('[API Interceptor] URL de base API:', API_BASE_URL);
  console.log('[API Interceptor] Original fetch sauvegardé:', !!originalFetch);
  console.log('[API Interceptor] ============================================');
  
  // Vérifier si fetch est bien intercepté
  setTimeout(() => {
    console.log('[API Interceptor] Vérification après 1s - fetch intercepté:', window.fetch !== originalFetch);
  }, 1000);
}

