/**
 * Intercepteur global pour rediriger les appels API vers le serveur en production
 * dans l'app mobile Capacitor
 */

// Détecter si on est dans Capacitor
const isCapacitor = typeof window !== 'undefined' && window.Capacitor;

// URL de base pour les API en production
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cvneat.fr';

// Sauvegarder le fetch original
const originalFetch = window.fetch;

// Intercepter tous les appels fetch
window.fetch = async function(input, init = {}) {
  // Si on est dans Capacitor et que l'URL commence par /api/
  if (isCapacitor && typeof input === 'string' && input.startsWith('/api/')) {
    // Remplacer par l'URL complète du serveur
    const fullUrl = `${API_BASE_URL}${input}`;
    console.log(`[API Interceptor] ${input} → ${fullUrl}`);
    return originalFetch(fullUrl, init);
  }
  
  // Si c'est une URL relative qui commence par /api/ mais pas http
  if (isCapacitor && typeof input === 'string' && input.startsWith('/api/') && !input.startsWith('http')) {
    const fullUrl = `${API_BASE_URL}${input}`;
    console.log(`[API Interceptor] ${input} → ${fullUrl}`);
    return originalFetch(fullUrl, init);
  }
  
  // Sinon, utiliser le fetch original
  return originalFetch(input, init);
};

// Exporter pour utilisation manuelle si nécessaire
export const getApiUrl = (path) => {
  if (isCapacitor && path.startsWith('/api/')) {
    return `${API_BASE_URL}${path}`;
  }
  return path;
};

