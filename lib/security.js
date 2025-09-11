// Utilitaires de sécurité avancés

/**
 * Génère un token CSRF sécurisé
 * @returns {string} - Token CSRF
 */
export function generateCSRFToken() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Valide un token CSRF
 * @param {string} token - Token à valider
 * @param {string} sessionToken - Token de session
 * @returns {boolean} - True si le token est valide
 */
export function validateCSRFToken(token, sessionToken) {
  if (!token || !sessionToken) {
    return false;
  }
  return token === sessionToken;
}

/**
 * Vérifie si une requête provient d'une source fiable
 * @param {Request} request - Objet Request
 * @returns {boolean} - True si la requête est fiable
 */
export function isTrustedOrigin(request) {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  
  const allowedOrigins = [
    'http://localhost:3000',
    'https://cvneat.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean);
  
  return allowedOrigins.includes(origin) || allowedOrigins.some(allowed => 
    referer && referer.startsWith(allowed)
  );
}

/**
 * Vérifie la force d'un mot de passe avec des critères avancés
 * @param {string} password - Le mot de passe à vérifier
 * @returns {object} - { score: number, feedback: string[] }
 */
export function getPasswordStrength(password) {
  let score = 0;
  const feedback = [];
  
  if (password.length >= 8) score += 1;
  else feedback.push('Utilisez au moins 8 caractères');
  
  if (password.length >= 12) score += 1;
  
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Ajoutez des minuscules');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Ajoutez des majuscules');
  
  if (/[0-9]/.test(password)) score += 1;
  else feedback.push('Ajoutez des chiffres');
  
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else feedback.push('Ajoutez des caractères spéciaux');
  
  // Vérifier les patterns communs
  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    feedback.push('Évitez les répétitions de caractères');
  }
  
  if (/123|abc|qwe/i.test(password)) {
    score -= 1;
    feedback.push('Évitez les séquences communes');
  }
  
  return { score: Math.max(0, score), feedback };
}

/**
 * Vérifie si une IP est dans une liste noire
 * @param {string} ip - Adresse IP à vérifier
 * @returns {boolean} - True si l'IP est blacklistée
 */
export function isBlacklistedIP(ip) {
  // Liste d'IPs suspectes (à étendre selon les besoins)
  const blacklistedIPs = [
    '127.0.0.1', // Localhost (pour les tests)
    // Ajouter d'autres IPs suspectes ici
  ];
  
  return blacklistedIPs.includes(ip);
}

/**
 * Génère un hash sécurisé pour les données sensibles
 * @param {string} data - Données à hasher
 * @returns {Promise<string>} - Hash des données
 */
export async function hashSensitiveData(data) {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Vérifie la validité d'un token JWT
 * @param {string} token - Token JWT
 * @returns {Promise<object>} - { valid: boolean, payload: object }
 */
export async function validateJWT(token) {
  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    
    // Vérifier l'expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return { valid: false, payload: null };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, payload: null };
  }
}
