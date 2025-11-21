'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { safeLocalStorage } from '../lib/localStorage';

// ID du pixel Facebook (à remplacer par votre ID réel)
const FACEBOOK_PIXEL_ID = process.env.NEXT_PUBLIC_FACEBOOK_PIXEL_ID || '';

export default function FacebookPixel() {
  const pathname = usePathname();

  useEffect(() => {
    // Vérifier si le pixel ID est configuré (avertissement en mode dev uniquement)
    if (!FACEBOOK_PIXEL_ID) {
      if (process.env.NODE_ENV === 'development') {
        console.info('ℹ️ Facebook Pixel non configuré (optionnel)');
      }
      return;
    }

    // Vérifier les préférences de cookies
    const cookieConsent = safeLocalStorage.getJSON('cookieConsent');
    const marketingAllowed = cookieConsent?.marketing !== false; // Par défaut autorisé si non défini

    if (!marketingAllowed) {
      console.log('🚫 Facebook Pixel désactivé - Consentement marketing refusé');
      return;
    }

    // Initialiser le pixel Facebook
    if (typeof window !== 'undefined' && !window.fbq) {
      (function(f,b,e,v,n,t,s) {
        if(f.fbq)return;
        n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;
        n.push=n;
        n.loaded=!0;
        n.version='2.0';
        n.queue=[];
        t=b.createElement(e);
        t.async=!0;
        t.src=v;
        s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)
      })(window, document,'script','https://connect.facebook.net/en_US/fbevents.js');

      window.fbq('init', FACEBOOK_PIXEL_ID);
      window.fbq('track', 'PageView');
    }

    // Track PageView à chaque changement de page
    if (window.fbq && pathname) {
      window.fbq('track', 'PageView');
    }
  }, [pathname]);

  return null;
}

// Fonction utilitaire pour tracker les événements depuis n'importe où dans l'app
export const trackFacebookEvent = (eventName, eventData = {}) => {
  if (typeof window === 'undefined' || !window.fbq) {
    console.warn('Facebook Pixel non initialisé');
    return;
  }

  // Vérifier le consentement
  const cookieConsent = safeLocalStorage.getJSON('cookieConsent');
  const marketingAllowed = cookieConsent?.marketing !== false;

  if (!marketingAllowed) {
    return;
  }

  window.fbq('track', eventName, eventData);
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



