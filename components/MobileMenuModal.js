'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaMinus, FaShoppingCart, FaStar, FaClock, FaMapMarkerAlt } from 'react-icons/fa';

export default function MobileMenuModal({ 
  isOpen, 
  onClose, 
  restaurant, 
  menu, 
  loading, 
  error,
  onAddToCart,
  cart = []
}) {
  const [activeCategory, setActiveCategory] = useState(null);
  const [cartTotal, setCartTotal] = useState(0);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Fermer avec le bouton retour du navigateur
      const handlePopState = () => onClose();
      window.addEventListener('popstate', handlePopState);
      window.history.pushState(null, '', window.location.pathname);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('popstate', handlePopState);
      };
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    // Calculer le total du panier
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    setCartTotal(total);
  }, [cart]);



  const getItemQuantity = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleAddToCart = (item) => {
    onAddToCart(item);
  };

  const handleRemoveFromCart = (itemId) => {
    const item = cart.find(i => i.id === itemId);
    if (item && item.quantity > 1) {
      // Diminuer la quantité
      onAddToCart({ ...item, quantity: item.quantity - 1 });
    } else {
      // Supprimer complètement
      onAddToCart({ ...item, quantity: 0 });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            onClick={onClose}
            className="p-2 -m-2 text-gray-600 hover:text-gray-900"
          >
            <FaTimes className="w-5 h-5" />
          </button>
          
          <div className="flex-1 ml-3">
            <h2 className="text-lg font-bold text-gray-900 line-clamp-1">
              {restaurant?.nom}
            </h2>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FaStar className="text-yellow-400" />
              <span>{restaurant?.note || '4.5'}</span>
              <span>•</span>
              <FaClock className="text-gray-400" />
              <span>20-30 min</span>
            </div>
          </div>

          {/* Panier flottant */}
          {cart.length > 0 && (
            <div className="relative">
              <div className="bg-black text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full px-4">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={onClose}
                className="bg-black text-white px-4 py-2 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto bg-white">
            {/* Produits */}
            <div className="p-4 space-y-4">
              {menu.map((item) => {
                    const quantity = getItemQuantity(item.id);
                    
                    return (
                      <div key={item.id} className="flex space-x-3 p-3 border border-gray-200 rounded-lg">
                        {/* Image du produit */}
                        <div className="flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.nom}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                const placeholder = e.target.parentElement.querySelector('.image-placeholder');
                                if (placeholder) placeholder.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          {(!item.image_url || item.image_url === '') && (
                            <div className="w-full h-full bg-gray-200 flex items-center justify-center image-placeholder">
                              <span className="text-gray-400 text-2xl">🍽️</span>
                            </div>
                          )}
                        </div>

                        {/* Informations du produit */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900 line-clamp-2">
                            {item.nom}
                          </h4>
                          <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-bold text-gray-900">
                              {item.prix.toFixed(2)}€
                            </span>
                            
                            {/* Contrôles de quantité */}
                            {quantity > 0 ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                                >
                                  <FaMinus className="w-3 h-3" />
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800"
                                >
                                  <FaPlus className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="bg-black text-white px-3 py-1 rounded-full text-sm font-medium hover:bg-gray-800"
                              >
                                Ajouter
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer avec panier */}
      {cart.length > 0 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} articles
              </p>
              <p className="font-bold text-lg">
                {cartTotal.toFixed(2)}€
              </p>
            </div>
            
            <button
              onClick={() => {
                // Naviguer vers le panier
                onClose();
                // Ici vous pouvez ajouter la navigation vers le panier
              }}
              className="bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 flex items-center space-x-2"
            >
              <FaShoppingCart />
              <span>Voir le panier</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 