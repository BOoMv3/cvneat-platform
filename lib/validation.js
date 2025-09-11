// Utilitaires de validation et sanitisation

/**
 * Valide le format d'un email
 * @param {string} email - L'email à valider
 * @returns {boolean} - True si l'email est valide
 */
export function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email.trim());
}

/**
 * Valide la force d'un mot de passe
 * @param {string} password - Le mot de passe à valider
 * @returns {object} - { isValid: boolean, errors: string[] }
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password || password.length < 8) {
    errors.push('Le mot de passe doit contenir au moins 8 caractères');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une majuscule');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins une minuscule');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un chiffre');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Le mot de passe doit contenir au moins un caractère spécial');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitise une chaîne de caractères pour éviter les injections XSS
 * @param {string} input - La chaîne à sanitiser
 * @returns {string} - La chaîne sanitisée
 */
export function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Supprime les balises HTML
    .replace(/javascript:/gi, '') // Supprime les scripts JavaScript
    .replace(/on\w+\s*=/gi, '') // Supprime les événements JavaScript
    .substring(0, 1000); // Limite la longueur
}

/**
 * Valide un numéro de téléphone français
 * @param {string} phone - Le numéro de téléphone à valider
 * @returns {boolean} - True si le numéro est valide
 */
export function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  // Supprime tous les espaces, tirets et points
  const cleanPhone = phone.replace(/[\s\-\.]/g, '');
  
  // Vérifie le format français (10 chiffres commençant par 0)
  const phoneRegex = /^0[1-9][0-9]{8}$/;
  return phoneRegex.test(cleanPhone);
}

/**
 * Valide un code postal français
 * @param {string} postalCode - Le code postal à valider
 * @returns {boolean} - True si le code postal est valide
 */
export function isValidPostalCode(postalCode) {
  if (!postalCode || typeof postalCode !== 'string') {
    return false;
  }
  
  const cleanPostalCode = postalCode.trim();
  const postalRegex = /^[0-9]{5}$/;
  return postalRegex.test(cleanPostalCode);
}

/**
 * Valide un montant (prix)
 * @param {number|string} amount - Le montant à valider
 * @returns {boolean} - True si le montant est valide
 */
export function isValidAmount(amount) {
  if (amount === null || amount === undefined) {
    return false;
  }
  
  const numAmount = parseFloat(amount);
  return !isNaN(numAmount) && numAmount >= 0 && numAmount <= 999999.99;
}

/**
 * Valide un ID numérique
 * @param {number|string} id - L'ID à valider
 * @returns {boolean} - True si l'ID est valide
 */
export function isValidId(id) {
  if (id === null || id === undefined) {
    return false;
  }
  
  const numId = parseInt(id);
  return !isNaN(numId) && numId > 0 && Number.isInteger(numId);
}
