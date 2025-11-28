/**
 * Configuration de l'URL de base pour les appels API
 * Dans l'app mobile, les API routes pointent vers le serveur en production
 */

// Détecter si on est dans Capacitor (app mobile)
const isCapacitor = typeof window !== 'undefined' && window.Capacitor;

// URL de base pour les API
// Dans l'app mobile, utiliser le serveur en production
// Sur le web, utiliser l'URL relative
export const getApiBaseUrl = () => {
  if (isCapacitor) {
    // Dans l'app mobile, pointer vers le serveur en production
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr';
  }
  
  // Sur le web, utiliser l'URL relative (fonctionne avec le serveur Next.js)
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Côté serveur (SSR)
  return process.env.NEXT_PUBLIC_APP_URL || 'https://cvneat.fr';
};

// Helper pour les appels API
export const apiFetch = async (path, options = {}) => {
  const baseUrl = getApiBaseUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
};

