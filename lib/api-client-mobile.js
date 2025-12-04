/**
 * Client API pour l'app mobile Capacitor
 * Utilise directement l'URL complète au lieu d'un intercepteur
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr';

// Détecter si on est dans Capacitor
const isCapacitor = () => {
  if (typeof window === 'undefined') return false;
  return window.location?.protocol === 'capacitor:' || 
         window.location?.href?.startsWith('capacitor://') ||
         !!window.Capacitor;
};

// Fonction pour obtenir l'URL complète de l'API
export const getApiUrl = (path) => {
  if (isCapacitor() && path.startsWith('/api/')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
};

// Fonction fetch adaptée pour Capacitor
export const apiFetch = async (path, options = {}) => {
  const url = getApiUrl(path);
  
  if (isCapacitor()) {
    console.log('[API Client] Appel dans Capacitor:', path, '→', url);
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(options.headers || {})
    }
  });
  
  return response;
};

