// Utilitaire pour gérer localStorage de manière sécurisée
const dispatchCartUpdated = () => {
  try {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cvneat-cart-updated'));
    }
  } catch {
    // ignore
  }
};

export const safeLocalStorage = {
  getItem: (key) => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(key);
      } catch (error) {
        console.error('Erreur localStorage getItem:', error);
        return null;
      }
    }
    return null;
  },

  setItem: (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, value);
        if (key === 'cart') dispatchCartUpdated();
      } catch (error) {
        console.error('Erreur localStorage setItem:', error);
      }
    }
  },

  removeItem: (key) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(key);
        if (key === 'cart') dispatchCartUpdated();
      } catch (error) {
        console.error('Erreur localStorage removeItem:', error);
      }
    }
  },

  getJSON: (key) => {
    if (typeof window !== 'undefined') {
      try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : null;
      } catch (error) {
        console.error('Erreur localStorage getJSON:', error);
        return null;
      }
    }
    return null;
  },

  setJSON: (key, value) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(key, JSON.stringify(value));
        if (key === 'cart') dispatchCartUpdated();
      } catch (error) {
        console.error('Erreur localStorage setJSON:', error);
      }
    }
  }
}; 