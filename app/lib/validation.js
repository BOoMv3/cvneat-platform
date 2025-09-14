// Fonctions de validation des données côté serveur

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

export const validatePassword = (password) => {
  // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateAddress = (address) => {
  if (!address || typeof address !== 'string') return false;
  return address.trim().length >= 5 && address.trim().length <= 200;
};

export const validatePostalCode = (postalCode) => {
  const postalRegex = /^\d{5}$/;
  return postalRegex.test(postalCode);
};

export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  return !isNaN(numPrice) && numPrice >= 0 && numPrice <= 1000;
};

export const validateQuantity = (quantity) => {
  const numQuantity = parseInt(quantity);
  return !isNaN(numQuantity) && numQuantity > 0 && numQuantity <= 50;
};

export const validateOrderStatus = (status) => {
  const validStatuses = ['pending', 'preparing', 'ready', 'delivered', 'cancelled'];
  return validStatuses.includes(status);
};

export const validateUserRole = (role) => {
  const validRoles = ['client', 'restaurant', 'livreur', 'admin'];
  return validRoles.includes(role);
};

export const sanitizeString = (str) => {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
};

export const validateMenu = (menuData) => {
  const errors = [];
  
  if (!menuData.name || menuData.name.trim().length < 2) {
    errors.push('Le nom du plat est requis (minimum 2 caractères)');
  }
  
  if (!menuData.description || menuData.description.trim().length < 10) {
    errors.push('La description est requise (minimum 10 caractères)');
  }
  
  if (!validatePrice(menuData.price)) {
    errors.push('Le prix doit être un nombre valide entre 0 et 1000€');
  }
  
  if (!menuData.category || menuData.category.trim().length < 2) {
    errors.push('La catégorie est requise');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateOrder = (orderData) => {
  const errors = [];
  
  if (!orderData.restaurant_id) {
    errors.push('ID du restaurant requis');
  }
  
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push('Au moins un article est requis');
  }
  
  if (orderData.items) {
    orderData.items.forEach((item, index) => {
      if (!item.menu_id) {
        errors.push(`Article ${index + 1}: ID du menu requis`);
      }
      if (!validateQuantity(item.quantity)) {
        errors.push(`Article ${index + 1}: Quantité invalide`);
      }
      if (!validatePrice(item.price)) {
        errors.push(`Article ${index + 1}: Prix invalide`);
      }
    });
  }
  
  if (!orderData.delivery_address) {
    errors.push('Adresse de livraison requise');
  }
  
  if (orderData.delivery_address && !validateAddress(orderData.delivery_address)) {
    errors.push('Adresse de livraison invalide');
  }
  
  if (orderData.phone && !validatePhone(orderData.phone)) {
    errors.push('Numéro de téléphone invalide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUser = (userData) => {
  const errors = [];
  
  if (!userData.email || !validateEmail(userData.email)) {
    errors.push('Email valide requis');
  }
  
  if (!userData.password || !validatePassword(userData.password)) {
    errors.push('Mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre');
  }
  
  if (!userData.first_name || userData.first_name.trim().length < 2) {
    errors.push('Prénom requis (minimum 2 caractères)');
  }
  
  if (!userData.last_name || userData.last_name.trim().length < 2) {
    errors.push('Nom requis (minimum 2 caractères)');
  }
  
  if (userData.phone && !validatePhone(userData.phone)) {
    errors.push('Numéro de téléphone invalide');
  }
  
  if (userData.role && !validateUserRole(userData.role)) {
    errors.push('Rôle utilisateur invalide');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
