'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FaPlus, FaMinus, FaTimes, FaShoppingCart, FaLeaf, FaUtensils, FaFlask } from 'react-icons/fa';

export default function MenuItemModal({ item, isOpen, onClose, onAddToCart, restaurantId }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedIngredients, setSelectedIngredients] = useState(new Set());
  const [removedIngredients, setRemovedIngredients] = useState(new Set());
  const [selectedMeats, setSelectedMeats] = useState(new Set()); // Nouvelles sélections de viandes
  const [selectedSauces, setSelectedSauces] = useState(new Set()); // Nouvelles sélections de sauces
  const [selectedDrink, setSelectedDrink] = useState(null); // Boisson sélectionnée pour les formules
  const [supplements, setSupplements] = useState([]);
  const [meatOptions, setMeatOptions] = useState([]); // Options de viande depuis la base de données
  const [sauceOptions, setSauceOptions] = useState([]); // Options de sauce depuis la base de données
  const [baseIngredients, setBaseIngredients] = useState([]); // Ingrédients de base depuis la base de données
  const [loading, setLoading] = useState(false);

  // DEBUG: Vérifier que onClose est bien une fonction
  useEffect(() => {
    console.log('🔍 MenuItemModal - onClose type:', typeof onClose, 'isOpen:', isOpen);
  }, [onClose, isOpen]);

  // Récupérer les suppléments, options de viande, sauces et ingrédients de base depuis l'item du menu
  useEffect(() => {
    if (isOpen) {
      // Récupérer les options de customisation depuis l'item
      // Options de viande
      if (item.meat_options) {
        let parsedMeats = item.meat_options;
        if (typeof item.meat_options === 'string') {
          try {
            parsedMeats = JSON.parse(item.meat_options);
          } catch (e) {
            parsedMeats = [];
          }
        }
        setMeatOptions(Array.isArray(parsedMeats) ? parsedMeats : []);
        
        // Sélectionner les viandes par défaut (default: true)
        const defaultMeats = parsedMeats.filter(m => m.default === true).map(m => m.id || m.nom);
        setSelectedMeats(new Set(defaultMeats));
      } else {
        setMeatOptions([]);
      }

      // Options de sauce
      if (item.sauce_options) {
        let parsedSauces = item.sauce_options;
        if (typeof item.sauce_options === 'string') {
          try {
            parsedSauces = JSON.parse(item.sauce_options);
          } catch (e) {
            parsedSauces = [];
          }
        }
        setSauceOptions(Array.isArray(parsedSauces) ? parsedSauces : []);
        
        // Sélectionner les sauces par défaut (default: true) seulement si max_sauces !== 0
        const maxSauces = item.max_sauces || item.max_sauce_count;
        if (maxSauces !== 0) {
          const defaultSauces = parsedSauces.filter(s => s.default === true).map(s => s.id || s.nom);
          setSelectedSauces(new Set(defaultSauces));
        } else {
          // Si max_sauces = 0, ne pas sélectionner de sauces (elles sont déjà comprises)
          setSelectedSauces(new Set());
        }
      } else {
        setSauceOptions([]);
      }

      // Ingrédients de base
      if (item.base_ingredients) {
        let parsedIngredients = item.base_ingredients;
        if (typeof item.base_ingredients === 'string') {
          try {
            parsedIngredients = JSON.parse(item.base_ingredients);
          } catch (e) {
            parsedIngredients = [];
          }
        }
        setBaseIngredients(Array.isArray(parsedIngredients) ? parsedIngredients : []);
      } else {
        setBaseIngredients([]);
      }

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
      console.log('🔍 Récupération suppléments pour restaurant:', restaurantId);
      
      // Essayer d'abord l'API du restaurant (plus fiable)
      let response = await fetch(`/api/restaurants/${restaurantId}/supplements`);
      
      if (!response.ok) {
        console.warn('⚠️ API restaurant supplements non disponible, essai menu item');
        // Fallback : essayer l'API spécifique au menu item
        response = await fetch(`/api/menu/${item.id}/supplements`);
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Suppléments récupérés:', data);
        
        // Formater les données pour correspondre au format attendu
        const formattedData = (data || []).map((sup, idx) => ({
          id: sup.id || `supp-${idx}`,
          name: sup.nom || sup.name || 'Supplément',
          price: parseFloat(sup.prix || sup.price || 0),
          description: sup.description || ''
        }));
        
        console.log('✅ Suppléments formatés:', formattedData);
        setSupplements(formattedData);
      } else {
        console.warn('⚠️ Aucune réponse valide pour les suppléments');
        setSupplements([]);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des suppléments:', error);
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

  // Utiliser baseIngredients depuis la base de données si disponible, sinon fallback sur defaultIngredients
  const itemIngredients = baseIngredients.length > 0 
    ? baseIngredients.map(ing => ({
        id: ing.id || ing.nom,
        name: ing.nom || ing.name,
        price: parseFloat(ing.prix || ing.price || 0),
        removable: ing.removable !== false // Par défaut, tous les ingrédients sont retirables
      }))
    : (defaultIngredients[item.nom] || []);
  const allIngredients = [...itemIngredients, ...extraIngredients];

  // Gestionnaire pour sélectionner/désélectionner les viandes
  const handleMeatToggle = (meatId) => {
    setSelectedMeats(prev => {
      const newSet = new Set(prev);
      if (newSet.has(meatId)) {
        // Désélectionner
        newSet.delete(meatId);
      } else {
        // Vérifier la limite de viandes si elle existe
        const maxMeats = item.max_meats || item.max_meat_count;
        if (maxMeats && newSet.size >= maxMeats) {
          // Afficher un message d'erreur
          alert(`Vous ne pouvez sélectionner que ${maxMeats} viande${maxMeats > 1 ? 's' : ''} maximum pour ce produit.`);
          return prev; // Ne pas ajouter
        }
        newSet.add(meatId);
      }
      return newSet;
    });
  };

  // Gestionnaire pour sélectionner/désélectionner les sauces
  const handleSauceToggle = (sauceId) => {
    const maxSauces = item.max_sauces || item.max_sauce_count;
    
    // Si max_sauces = 0, les sauces sont déjà comprises, on ne peut pas en sélectionner
    if (maxSauces === 0) {
      return; // Ne rien faire
    }
    
    setSelectedSauces(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sauceId)) {
        // Désélectionner
        newSet.delete(sauceId);
      } else {
        // Vérifier la limite de sauces si elle existe
        if (maxSauces && maxSauces > 0 && newSet.size >= maxSauces) {
          // Afficher un message d'erreur
          alert(`Vous ne pouvez sélectionner que ${maxSauces} sauce${maxSauces > 1 ? 's' : ''} maximum pour ce produit.`);
          return prev; // Ne pas ajouter
        }
        newSet.add(sauceId);
      }
      return newSet;
    });
  };

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
    
    // Ajouter le prix des viandes sélectionnées
    selectedMeats.forEach(meatId => {
      const meat = meatOptions.find(m => (m.id || m.nom) === meatId);
      if (meat) {
        total += parseFloat(meat.prix || meat.price || 0);
      }
    });

    // Ajouter le prix des sauces sélectionnées
    selectedSauces.forEach(sauceId => {
      const sauce = sauceOptions.find(s => (s.id || s.nom) === sauceId);
      if (sauce) {
        total += parseFloat(sauce.prix || sauce.price || 0);
      }
    });
    
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
    console.log('🛒 Ajout au panier démarré...', 'onClose:', typeof onClose);
    
    // Pour les formules uniquement, vérifier qu'une boisson est sélectionnée si des boissons sont disponibles
    if (item.is_formula && item.drink_options && item.drink_options.length > 0 && !selectedDrink) {
      alert('Veuillez choisir une boisson');
      return;
    }

    // Si c'est une formule, ajouter directement
    if (item.is_formula) {
      const formulaItem = {
        ...item,
        quantity: quantity,
        selected_drink: selectedDrink ? item.drink_options.find(d => d.id === selectedDrink) : null
      };
      console.log('✅ Formule ajoutée:', formulaItem.nom);
      onAddToCart(formulaItem, [], null, quantity);
      
      // Fermer IMMÉDIATEMENT
      console.log('🚪 Fermeture modal (formule)... Type:', typeof onClose);
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.error('❌ onClose n\'est PAS une fonction!');
      }
      return;
    }

    // Pour les formules uniquement, inclure la boisson sélectionnée
    // Les plats normaux ne doivent pas avoir de sélection de boisson
    if (item.is_formula && item.drink_options && item.drink_options.length > 0 && selectedDrink) {
      const selectedDrinkData = item.drink_options.find(d => d.id === selectedDrink);
      item.selected_drink = selectedDrinkData;
    }

    // Validation : vérifier si une sélection de viande est requise
    if (item.requires_meat_selection && selectedMeats.size === 0) {
      alert('Veuillez sélectionner au moins une viande');
      return;
    }

    // Validation : vérifier si une sélection de sauce est requise
    // Ne pas valider si max_sauces = 0 (sauces déjà comprises)
    const maxSauces = item.max_sauces || item.max_sauce_count;
    if (item.requires_sauce_selection && selectedSauces.size === 0 && maxSauces !== 0) {
      alert('Veuillez sélectionner au moins une sauce');
      return;
    }

    // Extraire les suppléments depuis selectedIngredients
    const supplementsList = Array.from(selectedIngredients).map(ingId => {
      const supplement = supplements.find(sup => sup.id === ingId);
      return supplement ? { id: supplement.id, nom: supplement.name, prix: supplement.price } : null;
    }).filter(Boolean);

    // Extraire les viandes sélectionnées
    const selectedMeatsList = Array.from(selectedMeats).map(meatId => {
      const meat = meatOptions.find(m => (m.id || m.nom) === meatId);
      return meat ? { 
        id: meat.id || meat.nom, 
        nom: meat.nom || meat.name, 
        prix: parseFloat(meat.prix || meat.price || 0) 
      } : null;
    }).filter(Boolean);

    // Extraire les sauces sélectionnées
    const selectedSaucesList = Array.from(selectedSauces).map(sauceId => {
      const sauce = sauceOptions.find(s => (s.id || s.nom) === sauceId);
      return sauce ? { 
        id: sauce.id || sauce.nom, 
        nom: sauce.nom || sauce.name, 
        prix: parseFloat(sauce.prix || sauce.price || 0) 
      } : null;
    }).filter(Boolean);

    const customizedItem = {
      ...item,
      quantity: quantity, // Utiliser la quantité sélectionnée
      supplements: supplementsList,
      customizations: {
        selectedMeats: selectedMeatsList,
        selectedSauces: selectedSaucesList,
        removedIngredients: Array.from(removedIngredients).map(ingId => {
          const ing = itemIngredients.find(i => i.id === ingId);
          return ing ? { id: ing.id, nom: ing.name } : { id: ingId, nom: ingId };
        }),
        addedIngredients: Array.from(selectedIngredients),
        totalPrice: calculateTotalPrice()
      },
      _fromModal: true // Marquer que cet item vient de la modal
    };
    
    // Ajouter au panier
    console.log('✅ Article ajouté:', customizedItem.nom);
    onAddToCart(customizedItem, supplementsList, null, quantity);
    
    // Fermer IMMÉDIATEMENT
    console.log('🚪 Fermeture modal (article)... Type:', typeof onClose);
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.error('❌ onClose n\'est PAS une fonction!');
    }
  };

  // Utiliser un portail pour rendre la modal directement dans le body
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Empêcher le scroll du body quand la modal est ouverte
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen || !mounted || typeof window === 'undefined') return null;

  const modalContent = (
    <>
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />
      
      {/* MODAL - VERSION MINUSCULE */}
      <div 
        className="fixed left-0 right-0 bottom-16 bg-white dark:bg-gray-800 rounded-t-3xl shadow-2xl z-50"
        onClick={(e) => e.stopPropagation()}
        style={{ 
          maxHeight: '40vh',
          height: '40vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* HEADER - UNE SEULE LIGNE */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm truncate flex-1">{item.nom}</h3>
          <button
            onClick={onClose}
            className="ml-3 p-1.5 hover:bg-gray-100 rounded-full flex-shrink-0"
          >
            <FaTimes className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* CONTENU SCROLLABLE */}
        <div 
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ 
            WebkitOverflowScrolling: 'touch',
            minHeight: 0
          }}
        >
          {/* Prix et Quantité - COMPACT */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-bold text-orange-600">{(item.prix * quantity).toFixed(2)}€</span>
              <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="p-1">
                  <FaMinus className="w-3 h-3" />
                </button>
                <span className="font-semibold w-6 text-center">{quantity}</span>
                <button onClick={() => setQuantity(quantity + 1)} className="p-1">
                  <FaPlus className="w-3 h-3" />
                </button>
              </div>
            </div>
            {item.is_formula && (
              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Formule</span>
            )}

            {/* Choix de boisson - VERSION COMPACTE */}
            {/* IMPORTANT: Afficher la sélection de boisson UNIQUEMENT pour les formules */}
            {item.is_formula && item.drink_options && item.drink_options.length > 0 && (
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                  <FaFlask className="w-4 h-4 text-blue-600 mr-1" />
                  Boisson <span className="text-red-500 ml-1">*</span>
                </h3>
                <div className="space-y-1.5">
                  {item.drink_options.map((drink) => {
                    const isSelected = selectedDrink === drink.id;
                    return (
                      <div
                        key={drink.id}
                        className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-sm ${
                          isSelected
                            ? 'bg-blue-50 border-blue-300'
                            : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedDrink(drink.id)}
                      >
                        <div className="flex items-center flex-1 min-w-0">
                          <span className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center flex-shrink-0 ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <span className="text-white text-xs">✓</span>}
                          </span>
                          <span className="font-medium truncate">{drink.nom}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Viandes - VERSION MINI */}
          {!item.is_formula && meatOptions.length > 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold mb-1.5">Viandes {item.requires_meat_selection && <span className="text-red-500">*</span>}</h3>
              <div className="space-y-1">
                {meatOptions.map((meat) => {
                  const meatId = meat.id || meat.nom;
                  const isSelected = selectedMeats.has(meatId);
                  return (
                    <div
                      key={meatId}
                      className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm ${
                        isSelected ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => handleMeatToggle(meatId)}
                    >
                      <div className="flex items-center">
                        <span className={`w-4 h-4 rounded border-2 mr-2 flex items-center justify-center ${
                          isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </span>
                        <span className="truncate">{meat.nom || meat.name}</span>
                      </div>
                      {(meat.prix || meat.price) > 0 && (
                        <span className="text-xs ml-2">+{parseFloat(meat.prix || meat.price || 0).toFixed(2)}€</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sauces - VERSION MINI */}
          {!item.is_formula && sauceOptions.length > 0 && (item.max_sauces || item.max_sauce_count) !== 0 && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold mb-1.5">Sauces {item.requires_sauce_selection && <span className="text-red-500">*</span>}</h3>
              <div className="space-y-1">
                {sauceOptions.map((sauce) => {
                  const sauceId = sauce.id || sauce.nom;
                  const isSelected = selectedSauces.has(sauceId);
                  return (
                    <div
                      key={sauceId}
                      className={`flex items-center justify-between p-2 rounded border cursor-pointer text-sm ${
                        isSelected ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => handleSauceToggle(sauceId)}
                    >
                      <div className="flex items-center flex-1 min-w-0">
                        <span className={`w-4 h-4 rounded border-2 mr-2 flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'border-yellow-500 bg-yellow-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <span className="text-white text-xs">✓</span>}
                        </span>
                        <span className="truncate">{sauce.nom || sauce.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ingrédients de base */}
          {!item.is_formula && itemIngredients.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <FaLeaf className="w-5 h-5 text-green-600 mr-2" />
                Ingrédients inclus (vous pouvez les retirer)
              </h3>
              <div className="space-y-2">
                {itemIngredients.map((ingredient) => (
                  <div
                    key={ingredient.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                      removedIngredients.has(ingredient.id)
                        ? 'bg-red-50 border-red-200 text-red-600'
                        : 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100'
                    }`}
                    onClick={() => handleIngredientToggle(ingredient)}
                  >
                    <div className="flex items-center">
                      <span className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        removedIngredients.has(ingredient.id)
                          ? 'border-red-400 bg-red-400'
                          : 'border-green-400 bg-green-400'
                      }`}>
                        {removedIngredients.has(ingredient.id) && <span className="text-white text-xs">✕</span>}
                      </span>
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
          {!item.is_formula && (
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
          )}

        </div>
      </div>

      {/* BOUTON FLOTTANT - TOUJOURS AU BAS DE L'ÉCRAN */}
      <div 
        className="fixed left-0 right-0 bottom-0 z-[60] bg-gradient-to-t from-orange-600 to-orange-500 shadow-2xl"
        style={{
          boxShadow: '0 -8px 24px rgba(251, 146, 60, 0.4)'
        }}
      >
        <div className="px-4 py-3">
          <button
            onClick={handleAddToCart}
            className="w-full bg-white text-orange-600 hover:bg-orange-50 font-extrabold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg transform transition-transform active:scale-95"
            style={{
              fontSize: '18px'
            }}
          >
            <FaShoppingCart className="w-6 h-6" />
            <span>AJOUTER AU PANIER • {item.is_formula ? (item.prix * quantity).toFixed(2) : calculateTotalPrice().toFixed(2)}€</span>
          </button>
        </div>
      </div>
    </>
  );

  // Rendre la modal dans le body via un portail
  return createPortal(modalContent, document.body);
}
