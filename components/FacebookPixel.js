'use client';

import { safeLocalStorage } from '../lib/localStorage';

export default function FacebookPixel() {
  // IMPORTANT: Tracking tiers désactivé.
  // On garde ce composant pour compatibilité (imports existants), mais il n’injecte aucun script.
  return null;
}

// Fonction utilitaire pour tracker les événements depuis n'importe où dans l'app
export const trackFacebookEvent = (eventName, eventData = {}) => {
  // No-op: aucun tracking tiers.
  // On lit quand même cookieConsent pour rester cohérent avec l’UX existante.
  void safeLocalStorage.getJSON('cookieConsent');
  void eventName;
  void eventData;
};

// Événements prédéfinis pour CVN'EAT
export const FacebookPixelEvents = {
  // Page View (automatique)
  pageView: () => trackFacebookEvent('PageView'),

  // Ajout au panier
  addToCart: (item) => {
    trackFacebookEvent('AddToCart', {
      content_name: item.nom || item.name,
      content_ids: [item.id],
      content_type: 'product',
      value: parseFloat(item.prix || item.price || 0),
      currency: 'EUR',
      contents: [{
        id: item.id,
        quantity: item.quantity || 1,
        item_price: parseFloat(item.prix || item.price || 0)
      }]
    });
  },

  // Initiate Checkout
  initiateCheckout: (cartTotal, items) => {
    trackFacebookEvent('InitiateCheckout', {
      value: parseFloat(cartTotal || 0),
      currency: 'EUR',
      num_items: items?.length || 0,
      contents: items?.map(item => ({
        id: item.id,
        quantity: item.quantity || 1,
        item_price: parseFloat(item.prix || item.price || 0)
      })) || []
    });
  },

  // Purchase (commande complétée)
  purchase: (orderData) => {
    trackFacebookEvent('Purchase', {
      value: parseFloat(orderData.total || orderData.montant_total || 0),
      currency: 'EUR',
      content_ids: [orderData.id],
      content_type: 'product',
      contents: orderData.items?.map(item => ({
        id: item.id || item.menu_id,
        quantity: item.quantity || 1,
        item_price: parseFloat(item.prix || item.price || item.prix_unitaire || 0)
      })) || [],
      order_id: orderData.id,
      num_items: orderData.items?.length || 0
    });
  },

  // View Content (vue d'un restaurant)
  viewRestaurant: (restaurant) => {
    trackFacebookEvent('ViewContent', {
      content_name: restaurant.nom || restaurant.name,
      content_ids: [restaurant.id],
      content_type: 'restaurant',
      content_category: restaurant.category || restaurant.cuisine_type
    });
  },

  // Search (recherche de restaurant)
  search: (searchTerm) => {
    trackFacebookEvent('Search', {
      search_string: searchTerm
    });
  },

  // Lead (inscription)
  lead: () => {
    trackFacebookEvent('Lead');
  },

  // Complete Registration (inscription complétée)
  completeRegistration: () => {
    trackFacebookEvent('CompleteRegistration');
  }
};



