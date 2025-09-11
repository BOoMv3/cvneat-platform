// Gestionnaire d'erreurs sécurisé

/**
 * Types d'erreurs sécurisées
 */
export const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  AUTHENTICATION: 'AUTHENTICATION_ERROR',
  AUTHORIZATION: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  RATE_LIMIT: 'RATE_LIMIT_ERROR',
  INTERNAL: 'INTERNAL_ERROR',
  NETWORK: 'NETWORK_ERROR'
};

/**
 * Messages d'erreur sécurisés (sans informations sensibles)
 */
export const ERROR_MESSAGES = {
  [ERROR_TYPES.VALIDATION]: 'Données invalides',
  [ERROR_TYPES.AUTHENTICATION]: 'Authentification requise',
  [ERROR_TYPES.AUTHORIZATION]: 'Accès non autorisé',
  [ERROR_TYPES.NOT_FOUND]: 'Ressource non trouvée',
  [ERROR_TYPES.RATE_LIMIT]: 'Trop de requêtes, veuillez réessayer plus tard',
  [ERROR_TYPES.INTERNAL]: 'Erreur interne du serveur',
  [ERROR_TYPES.NETWORK]: 'Erreur de connexion'
};

/**
 * Classe d'erreur sécurisée
 */
export class SecureError extends Error {
  constructor(type, message, statusCode = 500, details = null) {
    super(message);
    this.name = 'SecureError';
    this.type = type;
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Gestionnaire d'erreurs pour les API routes
 */
export function handleApiError(error, request) {
  // Log sécurisé (sans données sensibles)
  console.error('API Error:', {
    type: error.type || 'UNKNOWN',
    statusCode: error.statusCode || 500,
    path: request?.url,
    method: request?.method,
    timestamp: new Date().toISOString(),
    userAgent: request?.headers?.get('user-agent'),
    // Ne pas logger les détails sensibles
  });

  // Retourner une réponse sécurisée
  const statusCode = error.statusCode || 500;
  const message = error.type && ERROR_MESSAGES[error.type] 
    ? ERROR_MESSAGES[error.type] 
    : ERROR_MESSAGES[ERROR_TYPES.INTERNAL];

  return {
    error: {
      type: error.type || ERROR_TYPES.INTERNAL,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
      // Ne pas exposer les détails internes en production
      ...(process.env.NODE_ENV === 'development' && { details: error.details })
    }
  };
}

/**
 * Gestionnaire d'erreurs pour les composants React
 */
export function handleClientError(error, context = '') {
  // Log sécurisé côté client
  console.error('Client Error:', {
    context,
    type: error.type || 'UNKNOWN',
    message: error.message,
    timestamp: new Date().toISOString(),
    // Ne pas logger les données sensibles
  });

  // Retourner un message utilisateur sécurisé
  return {
    type: error.type || ERROR_TYPES.INTERNAL,
    message: error.type && ERROR_MESSAGES[error.type] 
      ? ERROR_MESSAGES[error.type] 
      : 'Une erreur inattendue s\'est produite',
    timestamp: new Date().toISOString()
  };
}

/**
 * Validation des erreurs d'entrée
 */
export function validateErrorInput(error) {
  if (!error || typeof error !== 'object') {
    return new SecureError(ERROR_TYPES.VALIDATION, 'Erreur invalide');
  }

  // Vérifier que l'erreur ne contient pas de données sensibles
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'auth'];
  const hasSensitiveData = Object.keys(error).some(key => 
    sensitiveFields.some(field => key.toLowerCase().includes(field))
  );

  if (hasSensitiveData) {
    return new SecureError(ERROR_TYPES.VALIDATION, 'Données sensibles détectées');
  }

  return error;
}

/**
 * Middleware de gestion d'erreurs pour Express
 */
export function errorMiddleware() {
  return (error, req, res, next) => {
    const secureError = handleApiError(error, req);
    
    res.status(secureError.error.statusCode).json(secureError);
  };
}

/**
 * Wrapper pour les fonctions async avec gestion d'erreurs
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validation des paramètres d'erreur
 */
export function sanitizeErrorParams(params) {
  const sanitized = {};
  
  Object.keys(params).forEach(key => {
    const value = params[key];
    
    // Ne pas inclure les valeurs sensibles
    if (typeof value === 'string' && 
        (value.includes('password') || 
         value.includes('token') || 
         value.includes('secret'))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeErrorParams(value);
    } else {
      sanitized[key] = value;
    }
  });
  
  return sanitized;
}

/**
 * Création d'erreurs typées
 */
export const createError = {
  validation: (message, details = null) => 
    new SecureError(ERROR_TYPES.VALIDATION, message, 400, details),
  
  authentication: (message = 'Authentification requise') => 
    new SecureError(ERROR_TYPES.AUTHENTICATION, message, 401),
  
  authorization: (message = 'Accès non autorisé') => 
    new SecureError(ERROR_TYPES.AUTHORIZATION, message, 403),
  
  notFound: (message = 'Ressource non trouvée') => 
    new SecureError(ERROR_TYPES.NOT_FOUND, message, 404),
  
  rateLimit: (message = 'Trop de requêtes') => 
    new SecureError(ERROR_TYPES.RATE_LIMIT, message, 429),
  
  internal: (message = 'Erreur interne') => 
    new SecureError(ERROR_TYPES.INTERNAL, message, 500),
  
  network: (message = 'Erreur de connexion') => 
    new SecureError(ERROR_TYPES.NETWORK, message, 503)
};
