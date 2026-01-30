'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaCheck, FaUtensils, FaTimes } from 'react-icons/fa';

export default function MenuItemWithSupplements({ item, onAddToCart, isAdding = false }) {
  const [selectedSupplements, setSelectedSupplements] = useState([]);
  const [supplements, setSupplements] = useState([]);
  const [showSupplements, setShowSupplements] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (showSupplements && !supplements.length) {
      fetchSupplements();
    }
  }, [showSupplements, item.id]);

  const fetchSupplements = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/menu/${item.id}/supplements`);
      if (response.ok) {
        const data = await response.json();
        setSupplements(data);
      }
    } catch (error) {
      console.error('Erreur récupération suppléments:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSupplement = (supplement) => {
    setSelectedSupplements(prev => {
      const isSelected = prev.find(s => s.id === supplement.id);
      if (isSelected) {
        return prev.filter(s => s.id !== supplement.id);
      } else {
        return [...prev, supplement];
      }
    });
  };

  const handleAddToCart = () => {
    const itemWithSupplements = {
      ...item,
      supplements: selectedSupplements,
      totalPrice: item.prix + selectedSupplements.reduce((sum, sup) => sum + sup.prix, 0)
    };
    onAddToCart(itemWithSupplements);
    setSelectedSupplements([]);
    setShowSupplements(false);
  };

  const getTotalPrice = () => {
    return item.prix + selectedSupplements.reduce((sum, sup) => sum + sup.prix, 0);
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all duration-300">
      {/* Image de l'article avec bords arrondis */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-orange-100 rounded-t-2xl overflow-hidden">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.nom}
            className="w-full h-full object-cover rounded-t-2xl"
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none';
              const placeholder = e.target.parentElement.querySelector('.image-placeholder');
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        {(!item.image_url || item.image_url === '') && (
          <div className="w-full h-full bg-gradient-to-br from-purple-200 to-orange-200 flex items-center justify-center rounded-t-2xl image-placeholder">
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* Bouton d'ajout */}
        <button
          onClick={() => setShowSupplements(true)}
          disabled={isAdding}
          className={`absolute bottom-3 right-3 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform ${
            isAdding
              ? 'bg-green-500 text-white scale-110 shadow-xl animate-pulse'
              : 'bg-white text-gray-800 hover:bg-gray-50 hover:scale-105'
          }`}
        >
          {isAdding ? (
            <>
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
              <FaPlus className="w-5 h-5 relative z-10 animate-bounce" />
            </>
          ) : (
            <FaPlus className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Informations de l'article */}
      <div className="p-4">
        {/* Titre */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {item.nom}
        </h3>

        {/* Description */}
        {item.description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Prix et suppléments */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {getTotalPrice().toFixed(2)}€
            </span>
            {selectedSupplements.length > 0 && (
              <span className="text-sm text-gray-500">
                +{selectedSupplements.length} suppl.
              </span>
            )}
          </div>

          {/* Bouton suppléments */}
          {supplements.length > 0 && (
            <button
              onClick={() => setShowSupplements(!showSupplements)}
              className="flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
            >
              <FaUtensils className="w-3 h-3" />
              Suppléments
            </button>
          )}
        </div>

        {/* Suppléments sélectionnés */}
        {selectedSupplements.length > 0 && (
          <div className="mb-3 p-2 bg-purple-50 rounded-lg">
            <p className="text-xs text-purple-700 font-medium mb-1">Suppléments sélectionnés:</p>
            <div className="space-y-1">
              {selectedSupplements.map(supplement => (
                <div key={supplement.id} className="flex items-center justify-between text-xs">
                  <span className="text-purple-800">{supplement.nom}</span>
                  <span className="text-purple-600">+{supplement.prix}€</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bouton d'ajout au panier */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`relative w-full py-3 px-4 rounded-lg transition-all duration-300 transform ${
            isAdding
              ? 'bg-green-500 text-white scale-95 shadow-xl animate-pulse'
              : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105 shadow-lg'
          }`}
        >
          {isAdding ? (
            <>
              <div className="absolute inset-0 bg-green-400 rounded-lg animate-ping"></div>
              <span className="relative z-10 flex items-center justify-center">
                <FaPlus className="mr-2 h-4 w-4 animate-bounce" />
                Ajouté ! ✓
              </span>
            </>
          ) : (
            'Ajouter au panier'
          )}
        </button>
      </div>

      {/* Modal des suppléments */}
      {showSupplements && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Suppléments pour {item.nom}
                </h3>
                <button
                  onClick={() => setShowSupplements(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimes className="h-5 w-5" />
                </button>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Chargement des suppléments...</p>
                </div>
              ) : supplements.length === 0 ? (
                <div className="text-center py-8">
                  <FaUtensils className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600">Aucun supplément disponible</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {supplements.map(supplement => {
                    const isSelected = selectedSupplements.find(s => s.id === supplement.id);
                    return (
                      <div
                        key={supplement.id}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => toggleSupplement(supplement)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{supplement.nom}</h4>
                            {supplement.description && (
                              <p className="text-sm text-gray-600">{supplement.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-gray-900">+{supplement.prix}€</span>
                            {isSelected && (
                              <FaCheck className="h-5 w-5 text-purple-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Résumé et validation */}
              {selectedSupplements.length > 0 && (
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-medium text-gray-900">Total:</span>
                    <span className="text-xl font-bold text-purple-600">
                      {getTotalPrice().toFixed(2)}€
                    </span>
                  </div>
                  <button
                    onClick={handleAddToCart}
                    className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
                  >
                    Ajouter au panier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 