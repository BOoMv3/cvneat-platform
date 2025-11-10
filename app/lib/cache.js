// Système de cache des données

class MemoryCache {
  constructor(options = {}) {
    this.cache = new Map();
    this.ttl = options.ttl || 5 * 60 * 1000; // 5 minutes par défaut
    this.maxSize = options.maxSize || 1000; // 1000 entrées max
  }

  set(key, value, ttl = null) {
    // Nettoyer le cache si nécessaire
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    const expiry = Date.now() + (ttl || this.ttl);
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Vérifier l'expiration
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return false;
    }

    // Vérifier l'expiration
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));

    // Si le cache est encore trop grand, supprimer les plus anciens
    if (this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].expiry - b[1].expiry);
      
      const toDelete = entries.slice(0, Math.floor(this.maxSize * 0.2));
      toDelete.forEach(([key]) => this.cache.delete(key));
    }
  }

  size() {
    return this.cache.size;
  }

  keys() {
    return Array.from(this.cache.keys());
  }
}

// Instance globale du cache
const cache = new MemoryCache({
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
});

// Nettoyer le cache toutes les minutes
setInterval(() => cache.cleanup(), 60 * 1000);

// Fonctions utilitaires pour le cache
export const cacheGet = (key) => cache.get(key);
export const cacheSet = (key, value, ttl) => cache.set(key, value, ttl);
export const cacheHas = (key) => cache.has(key);
export const cacheDelete = (key) => cache.delete(key);
export const cacheClear = () => cache.clear();

// Fonction pour créer une clé de cache
export const createCacheKey = (...parts) => {
  return parts.filter(Boolean).join(':');
};

// Cache avec invalidation automatique
export const withCache = (fn, options = {}) => {
  const {
    ttl = 5 * 60 * 1000,
    keyGenerator = (...args) => createCacheKey(...args),
    invalidatePattern = null
  } = options;

  return async (...args) => {
    const key = keyGenerator(...args);
    
    // Vérifier le cache
    if (cacheHas(key)) {
      return cacheGet(key);
    }

    // Exécuter la fonction
    const result = await fn(...args);
    
    // Mettre en cache
    cacheSet(key, result, ttl);
    
    return result;
  };
};

// Cache pour les requêtes API
export const apiCache = {
  get: (endpoint, params = {}) => {
    const key = createCacheKey('api', endpoint, JSON.stringify(params));
    return cacheGet(key);
  },
  
  set: (endpoint, params = {}, data, ttl = 2 * 60 * 1000) => {
    const key = createCacheKey('api', endpoint, JSON.stringify(params));
    cacheSet(key, data, ttl);
  },
  
  delete: (endpoint, params = {}) => {
    const key = createCacheKey('api', endpoint, JSON.stringify(params));
    cacheDelete(key);
  },
  
  invalidatePattern: (pattern) => {
    const keys = cache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cacheDelete(key);
      }
    });
  }
};

// Cache pour les données utilisateur
export const userCache = {
  get: (userId, dataType) => {
    const key = createCacheKey('user', userId, dataType);
    return cacheGet(key);
  },
  
  set: (userId, dataType, data, ttl = 10 * 60 * 1000) => {
    const key = createCacheKey('user', userId, dataType);
    cacheSet(key, data, ttl);
  },
  
  delete: (userId, dataType = null) => {
    if (dataType) {
      const key = createCacheKey('user', userId, dataType);
      cacheDelete(key);
    } else {
      // Supprimer toutes les données de l'utilisateur
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.startsWith(`user:${userId}:`)) {
          cacheDelete(key);
        }
      });
    }
  }
};

// Cache pour les restaurants
export const restaurantCache = {
  get: (restaurantId, dataType = 'info') => {
    const key = createCacheKey('restaurant', restaurantId, dataType);
    return cacheGet(key);
  },
  
  set: (restaurantId, dataType, data, ttl = 15 * 60 * 1000) => {
    const key = createCacheKey('restaurant', restaurantId, dataType);
    cacheSet(key, data, ttl);
  },
  
  delete: (restaurantId, dataType = null) => {
    if (dataType) {
      const key = createCacheKey('restaurant', restaurantId, dataType);
      cacheDelete(key);
    } else {
      // Supprimer toutes les données du restaurant
      const keys = cache.keys();
      keys.forEach(key => {
        if (key.startsWith(`restaurant:${restaurantId}:`)) {
          cacheDelete(key);
        }
      });
    }
  }
};

// Fonction pour invalider le cache lors des mises à jour
export const invalidateCache = (type, id = null) => {
  const keys = cache.keys();
  
  keys.forEach(key => {
    if (id) {
      // Invalider pour un ID spécifique
      if (key.includes(`${type}:${id}`)) {
        cacheDelete(key);
      }
    } else {
      // Invalider tout le type
      if (key.includes(`${type}:`)) {
        cacheDelete(key);
      }
    }
  });
};

// Middleware pour Next.js API routes
export const withCache = (handler, options = {}) => {
  return async (req, res) => {
    const {
      ttl = 5 * 60 * 1000,
      keyGenerator = (req) => createCacheKey(req.url, req.method)
    } = options;

    const key = keyGenerator(req);
    
    // Vérifier le cache
    const cached = cacheGet(key);
    if (cached) {
      res.headers.set('X-Cache', 'HIT');
      return new Response(JSON.stringify(cached), {
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }

    // Exécuter le handler
    const response = await handler(req, res);
    
    // Mettre en cache si succès
    if (response.status === 200) {
      try {
        const data = await response.json();
        cacheSet(key, data, ttl);
        res.headers.set('X-Cache', 'MISS');
      } catch (error) {
        console.error('Erreur lors de la mise en cache:', error);
      }
    }

    return response;
  };
};

export default cache;
