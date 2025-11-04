'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPlus, FaMinus, FaTimes, FaShoppingCart, FaLeaf, FaFire, FaWheat } from 'react-icons/fa';

export default function MenuItemModal({ item, isOpen, onClose, onAddToCart, restaurantId }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState(new Set());
  const [removedIngredients, setRemovedIngredients] = useState(new Set());
  const [supplements, setSupplements] = useState([]);
  const [loading, setLoading] = useState(false);

  // Récupérer les suppléments depuis l'item du menu ou le restaurant
  useEffect(() => {
    if (isOpen) {
      // D'abord, vérifier si l'item a des suppléments intégrés
      if (item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0) {
        // Parser les suppléments si c'est une chaîne JSON
        let parsedSupplements = item.supplements;
        if (typeof item.supplements === 'string') {
          try {
            parsedSupplements = JSON.parse(item.supplements);
          } catch (e) {
            parsedSupplements = [];
          }
        }
        // Formater les suppléments pour correspondre au format attendu
        const formattedSupplements = parsedSupplements.map((sup, idx) => ({
          id: sup.id || `supp-${idx}`,
          name: sup.nom || sup.name || 'Supplément',
          price: parseFloat(sup.prix || sup.price || 0),
          description: sup.description || ''
        }));
        setSupplements(formattedSupplements);
        setLoading(false);
      } else if (restaurantId) {
        // Sinon, récupérer depuis l'API
        fetchSupplements();
      } else {
        setSupplements([]);
        setLoading(false);
      }
    }
  }, [isOpen, restaurantId, item]);

  const fetchSupplements = async () => {
    setLoading(true);
    try {
      // Essayer d'abord l'API spécifique au menu item
      let response = await fetch(`/api/menu/${item.id}/supplements`);
      if (!response.ok || (await response.json()).length === 0) {
        // Si pas de suppléments spécifiques, essayer l'API du restaurant
        response = await fetch(`/api/restaurants/${restaurantId}/supplements`);
      }
      if (response.ok) {
        const data = await response.json();
        // Formater les données pour correspondre au format attendu
        const formattedData = data.map((sup, idx) => ({
          id: sup.id || `supp-${idx}`,
          name: sup.nom || sup.name || 'Supplément',
          price: parseFloat(sup.prix || sup.price || 0),
          description: sup.description || ''
        }));
        setSupplements(formattedData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des suppléments:', error);
      setSupplements([]);
    } finally {
      setLoading(false);
    }
  };

  // Ingrédients par défaut pour chaque plat (vous pouvez les récupérer depuis la base de données)
  const defaultIngredients = {
    'Margherita': [
      { id: 'tomato', name: 'Sauce tomate', price: 0, removable: true },
      { id: 'mozzarella', name: 'Mozzarella', price: 0, removable: true },
      { id: 'basil', name: 'Basilic frais', price: 0, removable: true },
      { id: 'olive_oil', name: 'Huile d\'olive', price: 0, removable: true }
    ],
    'Pepperoni': [
      { id: 'tomato', name: 'Sauce tomate', price: 0, removable: true },
      { id: 'mozzarella', name: 'Mozzarella', price: 0, removable: true },
      { id: 'pepperoni', name: 'Pepperoni', price: 2, removable: true },
      { id: 'olive_oil', name: 'Huile d\'olive', price: 0, removable: true }
    ],
    'Quattro Stagioni': [
      { id: 'tomato', name: 'Sauce tomate', price: 0, removable: true },
      { id: 'mozzarella', name: 'Mozzarella', price: 0, removable: true },
      { id: 'artichoke', name: 'Artichauts', price: 1.5, removable: true },
      { id: 'mushrooms', name: 'Champignons', price: 1.5, removable: true },
      { id: 'ham', name: 'Jambon', price: 2, removable: true },
      { id: 'olives', name: 'Olives noires', price: 1, removable: true }
    ]
  };

  // Ingrédients supplémentaires disponibles
  const extraIngredients = [
    { id: 'extra_cheese', name: 'Fromage supplémentaire', price: 2 },
    { id: 'extra_pepperoni', name: 'Pepperoni supplémentaire', price: 2.5 },
    { id: 'extra_mushrooms', name: 'Champignons supplémentaires', price: 1.5 },
    { id: 'extra_olives', name: 'Olives supplémentaires', price: 1 },
    { id: 'extra_artichoke', name: 'Artichauts supplémentaires', price: 2 },
    { id: 'extra_ham', name: 'Jambon supplémentaire', price: 2.5 },
    { id: 'extra_basil', name: 'Basilic supplémentaire', price: 1 },
    { id: 'extra_tomato', name: 'Tomates fraîches', price: 1.5 }
  ];

  const itemIngredients = defaultIngredients[item.nom] || [];
  const allIngredients = [...itemIngredients, ...extraIngredients];

  const handleIngredientToggle = (ingredient) => {
    if (itemIngredients.some(ing => ing.id === ingredient.id)) {
      // Ingrédient de base - on peut le retirer
      setRemovedIngredients(prev => {
        const newSet = new Set(prev);
        if (newSet.has(ingredient.id)) {
          newSet.delete(ingredient.id);
        } else {
          newSet.add(ingredient.id);
        }
        return newSet;
      });
    } else {
      // Ingrédient supplémentaire - on peut l'ajouter
      setSelectedIngredients(prev => {
        const newSet = new Set(prev);
        if (newSet.has(ingredient.id)) {
          newSet.delete(ingredient.id);
        } else {
          newSet.add(ingredient.id);
        }
        return newSet;
      });
    }
  };

  const calculateTotalPrice = () => {
    let total = item.prix || 0;
    
    // Ajouter le prix des suppléments sélectionnés
    selectedIngredients.forEach(ingredientId => {
      const supplement = supplements.find(sup => sup.id === ingredientId);
      if (supplement) {
        total += supplement.price;
      }
    });

    return total * quantity;
  };

  const handleAddToCart = () => {
    // Extraire les suppléments depuis selectedIngredients
    const supplementsList = Array.from(selectedIngredients).map(ingId => {
      const supplement = supplements.find(sup => sup.id === ingId);
      return supplement ? { id: supplement.id, nom: supplement.name, prix: supplement.price } : null;
    }).filter(Boolean);

    const customizedItem = {
      ...item,
      quantity: quantity, // Utiliser la quantité sélectionnée
      supplements: supplementsList,
      customizations: {
        removedIngredients: Array.from(removedIngredients),
        addedIngredients: Array.from(selectedIngredients),
        totalPrice: calculateTotalPrice()
      }
    };
    
    onAddToCart(customizedItem);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative">
          {item.image_url && (
            <div className="relative h-48 w-full">
              <Image
                src={item.image_url}
                alt={item.nom}
                fill
                className="object-cover rounded-t-2xl"
              />
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-full p-2 hover:bg-opacity-100 transition-all"
          >
            <FaTimes className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Titre et description */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">{item.nom}</h2>
            <p className="text-gray-600 mb-4">{item.description}</p>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-orange-600">{calculateTotalPrice().toFixed(2)}€</span>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500">Quantité:</span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <FaMinus className="w-4 h-4" />
                  </button>
                  <span className="px-4 py-2 font-medium">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 hover:bg-gray-100 transition-colors"
                  >
                    <FaPlus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Ingrédients de base */}
          {itemIngredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FaLeaf className="w-5 h-5 text-green-600 mr-2" />
                Ingrédients inclus
              </h3>
              <div className="space-y-2">
                {itemIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                      removedIngredients.has(ingredient.id)
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-green-50 border-green-200 text-green-800'
                    }`}
                    onClick={() => handleIngredientToggle(ingredient)}
                  >
                    <div className="flex items-center">
                      <span className={`w-4 h-4 rounded-full border-2 mr-3 ${
                        removedIngredients.has(ingredient.id)
                          ? 'border-red-400 bg-red-400'
                          : 'border-green-400 bg-green-400'
                      }`}></span>
                      <span className={removedIngredients.has(ingredient.id) ? 'line-through' : ''}>
                        {ingredient.name}
                      </span>
                    </div>
                    {ingredient.price > 0 && (
                      <span className="text-sm font-medium">+{ingredient.price}€</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingrédients supplémentaires */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
              <FaPlus className="w-5 h-5 text-orange-600 mr-2" />
              Ajouter des ingrédients
            </h3>
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                <p className="text-gray-500 mt-2">Chargement des suppléments...</p>
              </div>
            ) : (
              <div className="space-y-2">
                {supplements.length > 0 ? (
                  supplements.map((supplement) => (
                    <div
                      key={supplement.id}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        selectedIngredients.has(supplement.id)
                          ? 'bg-orange-50 border-orange-200 text-orange-800'
                          : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => handleIngredientToggle(supplement)}
                    >
                      <div className="flex items-center">
                        <span className={`w-4 h-4 rounded-full border-2 mr-3 ${
                          selectedIngredients.has(supplement.id)
                            ? 'border-orange-400 bg-orange-400'
                            : 'border-gray-300'
                        }`}></span>
                        <div>
                          <span className="font-medium">{supplement.name}</span>
                          {supplement.description && (
                            <p className="text-xs text-gray-500 mt-1">{supplement.description}</p>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-medium text-orange-600">+{supplement.price.toFixed(2)}€</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    <p>Aucun supplément disponible</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bouton d'ajout au panier */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-orange-600 text-white py-4 rounded-xl hover:bg-orange-700 transition-colors flex items-center justify-center space-x-2 font-semibold text-lg"
          >
            <FaShoppingCart className="w-5 h-5" />
            <span>Ajouter au panier - {calculateTotalPrice().toFixed(2)}€</span>
          </button>
        </div>
      </div>
    </div>
  );
}
