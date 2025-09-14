// Système de rate limiting pour les APIs

const rateLimitMap = new Map();

export const rateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 100, // Limite par fenêtre
    message = 'Trop de requêtes, veuillez réessayer plus tard',
    keyGenerator = (req) => {
      // Utiliser l'IP comme clé par défaut
      return req.headers.get('x-forwarded-for') || 
             req.headers.get('x-real-ip') || 
             'unknown';
    }
  } = options;

  return (req) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Nettoyer les anciennes entrées
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 0, resetTime: now + windowMs });
    }
    
    const record = rateLimitMap.get(key);
    
    // Réinitialiser le compteur si la fenêtre est expirée
    if (now > record.resetTime) {
      record.count = 0;
      record.resetTime = now + windowMs;
    }
    
    // Vérifier la limite
    if (record.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        message
      };
    }
    
    // Incrémenter le compteur
    record.count++;
    
    return {
      allowed: true,
      remaining: max - record.count,
      resetTime: record.resetTime
    };
  };
};

// Rate limiter spécifique pour l'authentification
export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 tentatives de connexion par fenêtre
  message: 'Trop de tentatives de connexion, veuillez réessayer dans 15 minutes'
});

// Rate limiter pour les commandes
export const orderRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 commandes par minute
  message: 'Trop de commandes, veuillez ralentir'
});

// Rate limiter pour les avis
export const reviewRateLimiter = rateLimiter({
  windowMs: 24 * 60 * 60 * 1000, // 24 heures
  max: 10, // 10 avis par jour
  message: 'Limite d\'avis atteinte pour aujourd\'hui'
});

// Rate limiter général pour les APIs
export const apiRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requêtes par fenêtre
  message: 'Trop de requêtes API, veuillez réessayer plus tard'
});

// Middleware pour Next.js API routes
export const withRateLimit = (rateLimiterFn) => {
  return (handler) => {
    return async (req, res) => {
      const result = rateLimiterFn(req);
      
      // Ajouter les headers de rate limiting
      if (result.resetTime) {
        res.headers.set('X-RateLimit-Reset', new Date(result.resetTime).toISOString());
      }
      
      if (!result.allowed) {
        res.headers.set('X-RateLimit-Remaining', '0');
        res.headers.set('Retry-After', Math.ceil((result.resetTime - Date.now()) / 1000));
        
        return new Response(JSON.stringify({ error: result.message }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(result.resetTime).toISOString(),
            'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000)
          }
        });
      }
      
      res.headers.set('X-RateLimit-Remaining', result.remaining.toString());
      
      return handler(req, res);
    };
  };
};

// Fonction utilitaire pour nettoyer le cache de rate limiting
export const cleanupRateLimitCache = () => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
};

// Nettoyer le cache toutes les 5 minutes
setInterval(cleanupRateLimitCache, 5 * 60 * 1000);
