'use client';

import { useState, useEffect } from 'react';
import { FaShoppingCart, FaTimes, FaTrash } from 'react-icons/fa';

export default function FloatingCart({ cart, onUpdateQuantity, onRemoveItem, onCheckout }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [total, setTotal] = useState(0);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const newTotal = cart.reduce((sum, item) => {
      const itemPrice = parseFloat(item.price || item.prix || 0);
      const itemQuantity = parseInt(item.quantity || 1, 10);
      
      // Calculer le prix des suppléments si présents
      let supplementsPrice = 0;
      if (item.supplements && Array.isArray(item.supplements)) {
        supplementsPrice = item.supplements.reduce((supSum, sup) => {
          return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
        }, 0);
      }
      
      // Calculer le prix de la taille si présente
      let sizePrice = 0;
      if (item.size && item.size.prix) {
        sizePrice = parseFloat(item.size.prix) || 0;
      } else if (item.prix_taille) {
        sizePrice = parseFloat(item.prix_taille) || 0;
      }
      
      return sum + ((itemPrice + supplementsPrice + sizePrice) * itemQuantity);
    }, 0);
    const newItemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    setTotal(newTotal);
    setItemCount(newItemCount);
  }, [cart]);

  if (itemCount === 0) return null;

  return (
    <>
      {/* Bouton flottant */}
      <button
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-50 bg-black text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-gray-800 transition-colors"
      >
        <FaShoppingCart className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
            {itemCount > 99 ? '99+' : itemCount}
          </span>
        )}
      </button>

      {/* Modal du panier */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-end">
          <div className="bg-white w-full max-h-[80vh] rounded-t-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold">Votre panier</h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="p-2 text-gray-600 hover:text-gray-900"
              >
                <FaTimes className="w-5 h-5" />
              </button>
            </div>

            {/* Contenu du panier */}
            <div className="flex-1 overflow-y-auto max-h-[60vh]">
              {cart.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <FaShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Votre panier est vide</p>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      {/* Image du produit */}
                      <div className="flex-shrink-0 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                        <span className="text-gray-400 text-lg">🍽️</span>
                      </div>

                      {/* Informations du produit */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 dark:text-white line-clamp-1">
                          {item.nom || item.name}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {(() => {
                            const itemPrice = parseFloat(item.prix || item.price || 0);
                            const supplementsPrice = item.supplements && Array.isArray(item.supplements) 
                              ? item.supplements.reduce((sum, sup) => sum + parseFloat(sup.prix || sup.price || 0), 0)
                              : 0;
                            const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
                            return (itemPrice + supplementsPrice + sizePrice).toFixed(2);
                          })()}€
                        </p>
                        {item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0 && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                            +{item.supplements.length} suppl.
                          </p>
                        )}
                      </div>

                      {/* Contrôles de quantité */}
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
                        >
                          <span className="text-gray-600 font-bold">-</span>
                        </button>
                        
                        <span className="w-8 text-center font-medium">
                          {item.quantity}
                        </span>
                        
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-black text-white rounded-full flex items-center justify-center hover:bg-gray-800"
                        >
                          <span className="font-bold">+</span>
                        </button>
                      </div>

                      {/* Bouton supprimer */}
                      <button
                        onClick={() => onRemoveItem(item.id)}
                        className="p-2 text-red-500 hover:text-red-700"
                      >
                        <FaTrash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer avec total et checkout */}
            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-bold">Total</span>
                  <span className="text-xl font-bold">{total.toFixed(2)}€</span>
                </div>
                
                <button
                  onClick={() => {
                    setIsExpanded(false);
                    onCheckout();
                  }}
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                  Commander ({itemCount} articles)
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
} 