'use client';

import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
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
  const [selectedFormulaOptions, setSelectedFormulaOptions] = useState({}); // Options sélectionnées pour les formules (par choice_group)
  const [supplements, setSupplements] = useState([]);
  const [meatOptions, setMeatOptions] = useState([]); // Options de viande depuis la base de données
  const [sauceOptions, setSauceOptions] = useState([]); // Options de sauce depuis la base de données
  const [baseIngredients, setBaseIngredients] = useState([]); // Ingrédients de base depuis la base de données
  const [loading, setLoading] = useState(false);
  const [internalIsOpen, setInternalIsOpen] = useState(isOpen); // State interne pour forcer la fermeture
  const [manuallyClosed, setManuallyClosed] = useState(false); // Flag pour indiquer qu'on a fermé manuellement

  // Synchroniser le state interne avec la prop isOpen uniquement quand isOpen devient true
  // Ne pas synchroniser quand isOpen devient false pour éviter de rouvrir après fermeture manuelle
  useEffect(() => {
    if (isOpen && !manuallyClosed) {
      // Si la modal est ouverte depuis l'extérieur et qu'on ne l'a pas fermée manuellement, on synchronise
      setInternalIsOpen(true);
      setManuallyClosed(false); // Réinitialiser le flag
    }
    // On ne synchronise pas quand isOpen devient false pour préserver la fermeture manuelle
  }, [isOpen, manuallyClosed]);

  // DEBUG: Vérifier que onClose est bien une fonction
  useEffect(() => {
    console.log('🔍 MenuItemModal - onClose type:', typeof onClose, 'isOpen:', isOpen, 'internalIsOpen:', internalIsOpen);
  }, [onClose, isOpen, internalIsOpen]);

  // Réinitialiser les états quand la modal se ferme
  useEffect(() => {
    if (!internalIsOpen) {
      setQuantity(1);
      setSelectedIngredients(new Set());
      setRemovedIngredients(new Set());
      setSelectedMeats(new Set());
      setSelectedSauces(new Set());
      setSelectedDrink(null);
      setSelectedFormulaOptions({});
      setSupplements([]);
    }
  }, [internalIsOpen]);

  // Récupérer les suppléments, options de viande, sauces et ingrédients de base depuis l'item du menu
  useEffect(() => {
    if (internalIsOpen && item) {
      console.log('🚀🚀🚀 MenuItemModal useEffect - Item reçu:', item.nom);
      console.log('🚀🚀🚀 Item complet:', JSON.stringify(item, null, 2));
      
      // Pour les formules, récupérer les ingrédients depuis le premier item de la formule (généralement le burger)
      let sourceItem = item;
      if (item.is_formula && item.formula_items && item.formula_items.length > 0) {
        // Trouver le premier item qui n'est pas une boisson (généralement le burger)
        const mainItem = item.formula_items.find(fi => {
          const menuName = (fi.menu?.nom || '').toLowerCase();
          return !menuName.includes('boisson') && !menuName.includes('drink') && !menuName.includes('frite');
        }) || item.formula_items[0];
        
        if (mainItem && mainItem.menu) {
          sourceItem = mainItem.menu;
          console.log('📦 Formule détectée, utilisation des ingrédients du burger:', mainItem.menu.nom);
        }
      }
      
      // Récupérer les options de customisation depuis l'item (ou depuis le burger de la formule)
      // Options de viande
      console.log('🔍 MenuItemModal - sourceItem:', sourceItem.nom);
      console.log('🔍 MenuItemModal - meat_options:', sourceItem.meat_options, 'Type:', typeof sourceItem.meat_options, 'IsArray:', Array.isArray(sourceItem.meat_options));
      console.log('🔍 MenuItemModal - sauce_options:', sourceItem.sauce_options, 'Type:', typeof sourceItem.sauce_options, 'IsArray:', Array.isArray(sourceItem.sauce_options));
      console.log('🔍 MenuItemModal - supplements:', sourceItem.supplements, 'Type:', typeof sourceItem.supplements, 'IsArray:', Array.isArray(sourceItem.supplements));
      console.log('🔍 MenuItemModal - base_ingredients:', sourceItem.base_ingredients, 'Type:', typeof sourceItem.base_ingredients, 'IsArray:', Array.isArray(sourceItem.base_ingredients));
      
      // Fonction helper pour normaliser les options (gérer tous les cas)
      const normalizeOptions = (value, name) => {
        if (!value) {
          console.warn(`⚠️ ${name} est null/undefined`);
          return [];
        }
        // Si c'est déjà un tableau, le retourner
        if (Array.isArray(value)) {
          console.log(`✅ ${name} est déjà un tableau:`, value.length, 'éléments');
          return value;
        }
        // Si c'est une string, essayer de la parser
        if (typeof value === 'string') {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              console.log(`✅ ${name} parsé depuis string:`, parsed.length, 'éléments');
              return parsed;
            }
            console.warn(`⚠️ ${name} parsé mais n'est pas un tableau`);
            return [];
          } catch (e) {
            console.error(`❌ Erreur parsing ${name} string:`, e);
            return [];
          }
        }
        // Si c'est un objet (JSONB de Supabase), essayer de le convertir
        if (typeof value === 'object' && value !== null) {
          // Vérifier si c'est un objet avec des propriétés numériques (comme un tableau)
          const keys = Object.keys(value);
          if (keys.length > 0 && keys.every(k => !isNaN(parseInt(k)))) {
            // C'est probablement un tableau sérialisé comme objet
            const array = Object.values(value);
            console.log(`✅ ${name} converti depuis objet:`, array.length, 'éléments');
            return array;
          }
          // Sinon, essayer de l'envelopper dans un tableau
          console.warn(`⚠️ ${name} est un objet non-tableau, tentative de conversion`);
          return [value];
        }
        console.warn(`⚠️ ${name} type inconnu:`, typeof value);
        return [];
      };
      
      const meatOptionsNormalized = normalizeOptions(sourceItem.meat_options, 'meat_options');
      console.log('✅ Meat options finales:', meatOptionsNormalized.length, 'options');
      setMeatOptions(meatOptionsNormalized);
      
      // Sélectionner les viandes par défaut (default: true)
      const defaultMeats = meatOptionsNormalized.filter(m => m.default === true).map(m => m.id || m.nom);
      console.log('✅ Viandes par défaut sélectionnées:', defaultMeats);
      setSelectedMeats(new Set(defaultMeats));

      // Options de sauce
      const sauceOptionsNormalized = normalizeOptions(sourceItem.sauce_options, 'sauce_options');
      console.log('✅ Sauce options finales:', sauceOptionsNormalized.length, 'options');
      setSauceOptions(sauceOptionsNormalized);
      
      // Sélectionner les sauces par défaut (default: true) seulement si max_sauces !== 0
      const maxSauces = sourceItem.max_sauces || sourceItem.max_sauce_count;
      console.log('🔍 max_sauces:', maxSauces);
      if (maxSauces !== 0) {
        const defaultSauces = sauceOptionsNormalized.filter(s => s.default === true).map(s => s.id || s.nom);
        console.log('✅ Sauces par défaut sélectionnées:', defaultSauces);
        setSelectedSauces(new Set(defaultSauces));
      } else {
        // Si max_sauces = 0, ne pas sélectionner de sauces (elles sont déjà comprises)
        console.log('ℹ️ max_sauces = 0, aucune sauce sélectionnée par défaut');
        setSelectedSauces(new Set());
      }

      // Ingrédients de base
      const baseIngredientsNormalized = normalizeOptions(sourceItem.base_ingredients, 'base_ingredients');
      console.log('✅ Base ingredients finales:', baseIngredientsNormalized.length, 'ingrédients');
      setBaseIngredients(baseIngredientsNormalized);

      // D'abord, vérifier si l'item a des suppléments intégrés
      const supplementsNormalized = normalizeOptions(item.supplements, 'supplements');
      if (supplementsNormalized.length > 0) {
        // Formater les suppléments pour correspondre au format attendu
        const formattedSupplements = supplementsNormalized.map((sup, idx) => ({
          id: sup.id || `supp-${idx}`,
          name: sup.nom || sup.name || 'Supplément',
          price: parseFloat(sup.prix || sup.price || 0),
          description: sup.description || ''
        }));
        console.log('✅ Suppléments parsés:', formattedSupplements.length, 'suppléments');
        setSupplements(formattedSupplements);
        setLoading(false);
      } else if (restaurantId) {
        // Sinon, récupérer depuis l'API
        console.log('ℹ️ Suppléments non trouvés dans item, récupération depuis API...');
        fetchSupplements();
      } else {
        console.warn('⚠️ Aucun supplément trouvé et pas de restaurantId');
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
    
    // Pour les formules et menus UNIQUEMENT, vérifier qu'une boisson est sélectionnée si des boissons sont disponibles
    // IMPORTANT: Seuls les menus (détectés par nom/catégorie) et les formules ont des boissons obligatoires
    // Les sandwiches, burgers seuls n'ont PAS de boissons obligatoires
    const isMenuOrFormula = item.is_formula || 
                            (item.category?.toLowerCase().includes('menu') || item.nom?.toLowerCase().includes('menu'));
    // Seulement pour les menus et formules, la boisson est obligatoire
    if (isMenuOrFormula && item.drink_options && item.drink_options.length > 0 && !selectedDrink) {
      alert('Veuillez choisir une boisson');
      return;
    }

    // Si c'est une formule (pas juste un menu), vérifier les choix optionnels requis
    if (item.is_formula) {
      // Vérifier si c'est le Menu Enfants et qu'un choix principal est requis
      const isMenuEnfants = item.nom?.toLowerCase().includes('enfant') || item.nom?.toLowerCase().includes('enfant');
      if (isMenuEnfants && (!selectedFormulaOptions['main_choice'] || Object.keys(selectedFormulaOptions).length === 0)) {
        alert('Veuillez choisir une option principale (Cheese Burger ou 4 Nuggets)');
        return;
      }
      
      // Vérifier les autres groupes de choix requis
      if (item.formula_choice_groups && Array.isArray(item.formula_choice_groups)) {
        const requiredGroups = item.formula_choice_groups.filter(g => g.required);
        for (const group of requiredGroups) {
          if (!selectedFormulaOptions[group.id]) {
            alert(`Veuillez choisir une option pour: ${group.title || 'Ce choix'}`);
            return;
          }
        }
      }
      
      // Extraire les suppléments depuis selectedIngredients pour les formules aussi
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

      // Calculer le prix unitaire avec les suppléments
      const finalPrice = calculateTotalPrice() / quantity; // Prix unitaire (car calculateTotalPrice retourne total * quantity)
      
      const formulaItem = {
        ...item,
        prix: finalPrice, // IMPORTANT: Mettre à jour le prix avec le prix total incluant suppléments
        quantity: quantity,
        selected_drink: selectedDrink ? item.drink_options.find(d => d.id === selectedDrink) : null,
        selected_formula_options: selectedFormulaOptions, // Inclure les choix optionnels
        supplements: supplementsList, // Inclure les suppléments
        customizations: {
          selectedMeats: selectedMeatsList, // Inclure les viandes personnalisées
          selectedSauces: selectedSaucesList, // Inclure les sauces personnalisées
          removedIngredients: Array.from(removedIngredients).map(ingId => {
            const ing = itemIngredients.find(i => i.id === ingId);
            return ing ? { id: ing.id, nom: ing.name } : { id: ingId, nom: ingId };
          }), // Inclure les ingrédients retirés
          addedIngredients: Array.from(selectedIngredients), // Inclure les ingrédients ajoutés
          totalPrice: calculateTotalPrice() // Prix total avec personnalisations
        }
      };
      console.log('✅ Formule ajoutée:', formulaItem.nom, 'avec boisson:', formulaItem.selected_drink?.nom || 'aucune', 'options:', selectedFormulaOptions, 'customizations:', formulaItem.customizations);
      
      // Fermer la modal IMMÉDIATEMENT et de manière synchrone
      console.log('🔒 Fermeture de la modal (formule)...');
      
      // Marquer comme fermé manuellement AVANT de fermer
      setManuallyClosed(true);
      
      // Utiliser flushSync pour forcer une mise à jour synchrone
      flushSync(() => {
        setInternalIsOpen(false);
      });
      
      // Appeler onClose pour mettre à jour le state parent
      if (typeof onClose === 'function') {
        onClose();
      } else {
        console.warn('⚠️ onClose n\'est pas une fonction:', typeof onClose);
      }
      
      // Ajouter au panier après un petit délai pour s'assurer que la modal est fermée
      setTimeout(() => {
        onAddToCart(formulaItem, supplementsList, null, quantity);
      }, 0);
      return;
    }

    // Pour les menus (non-formules) UNIQUEMENT, inclure la boisson sélectionnée
    // Les sandwiches, burgers seuls n'ont PAS de boisson
    // isMenuOrFormula est déjà défini plus haut et ne détecte que les vrais menus (par nom/catégorie) et formules
    if (isMenuOrFormula && !item.is_formula && item.drink_options && item.drink_options.length > 0 && selectedDrink) {
      const selectedDrinkData = item.drink_options.find(d => d.id === selectedDrink);
      item.selected_drink = selectedDrinkData;
      console.log('✅ Menu ajouté avec boisson:', item.nom, 'boisson:', selectedDrinkData?.nom || 'non trouvée');
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

    // Calculer le prix total incluant tous les suppléments, viandes, sauces
    const finalPrice = calculateTotalPrice() / quantity; // Prix unitaire (car calculateTotalPrice retourne total * quantity)
    
    const customizedItem = {
      ...item,
      prix: finalPrice, // IMPORTANT: Mettre à jour le prix avec le prix total incluant suppléments
      quantity: quantity, // Utiliser la quantité sélectionnée
      selected_drink: item.selected_drink || (selectedDrink && item.drink_options ? item.drink_options.find(d => d.id === selectedDrink) : null), // S'assurer que selected_drink est inclus
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
    
    // Fermer la modal IMMÉDIATEMENT et de manière synchrone
    console.log('🔒 Fermeture de la modal...');
    
    // Marquer comme fermé manuellement AVANT de fermer
    setManuallyClosed(true);
    
    // Utiliser flushSync pour forcer une mise à jour synchrone
    flushSync(() => {
      setInternalIsOpen(false);
    });
    
    // Appeler onClose pour mettre à jour le state parent
    if (typeof onClose === 'function') {
      onClose();
    } else {
      console.warn('⚠️ onClose n\'est pas une fonction:', typeof onClose);
    }
    
    // Ajouter au panier après un petit délai pour s'assurer que la modal est fermée
    console.log('✅ Article ajouté:', customizedItem.nom, 'avec boisson:', customizedItem.selected_drink?.nom || 'aucune');
    setTimeout(() => {
      onAddToCart(customizedItem, supplementsList, null, quantity);
    }, 0);
  };

  // Utiliser un portail pour rendre la modal directement dans le body
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Empêcher le scroll du body quand la modal est ouverte
    if (internalIsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [internalIsOpen]);

  if (!internalIsOpen || !mounted || typeof window === 'undefined') return null;

  const modalContent = (
    <>
      {/* OVERLAY */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={() => {
          setInternalIsOpen(false);
          if (typeof onClose === 'function') onClose();
        }}
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
            onClick={() => {
              setInternalIsOpen(false);
              if (typeof onClose === 'function') onClose();
            }}
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

            {/* Choix optionnels pour les formules (Menu Enfants par exemple) */}
            {item.is_formula && item.formula_items && item.formula_items.length > 0 && (
              (() => {
                // Détecter si c'est le Menu Enfants ou une formule avec options de choix
                const isMenuEnfants = item.nom?.toLowerCase().includes('enfant') || item.nom?.toLowerCase().includes('enfant');
                const hasChoiceGroups = item.formula_choice_groups && Array.isArray(item.formula_choice_groups);
                
                // Pour le Menu Enfants, créer des groupes de choix basés sur les formula_items
                if (isMenuEnfants && item.formula_items) {
                  // Trouver les items qui font partie d'un choix (Cheese Burger OU 4 Nuggets)
                  const choiceItems = item.formula_items.filter(fi => {
                    const menuName = fi.menu?.nom?.toLowerCase() || '';
                    return menuName.includes('cheese') || menuName.includes('burger') || menuName.includes('nugget') || menuName.includes('4 nuggets');
                  });
                  
                  if (choiceItems.length > 0) {
                    return (
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                          <FaUtensils className="w-4 h-4 text-orange-600 mr-1" />
                          Choix principal <span className="text-red-500 ml-1">*</span>
                        </h3>
                        <div className="space-y-1.5">
                          {choiceItems.map((choiceItem) => {
                            const menuItem = choiceItem.menu || {};
                            const choiceId = menuItem.id || choiceItem.menu_id || choiceItem.id;
                            const isSelected = selectedFormulaOptions['main_choice'] === choiceId;
                            return (
                              <div
                                key={choiceId}
                                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-sm ${
                                  isSelected
                                    ? 'bg-orange-50 border-orange-300'
                                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                }`}
                                onClick={() => setSelectedFormulaOptions(prev => ({
                                  ...prev,
                                  'main_choice': choiceId
                                }))}
                              >
                                <div className="flex items-center flex-1 min-w-0">
                                  <span className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center flex-shrink-0 ${
                                    isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && <span className="text-white text-xs">✓</span>}
                                  </span>
                                  <span className="font-medium truncate">{menuItem.nom || 'Option'}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  }
                }
                
                // Support pour les formules avec formula_choice_groups
                if (hasChoiceGroups) {
                  return item.formula_choice_groups.map((group, groupIndex) => (
                    <div key={group.id || groupIndex} className="mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center">
                        <FaUtensils className="w-4 h-4 text-orange-600 mr-1" />
                        {group.title || 'Choix'} {group.required && <span className="text-red-500 ml-1">*</span>}
                      </h3>
                      <div className="space-y-1.5">
                        {(group.options || []).map((option) => {
                          const isSelected = selectedFormulaOptions[group.id] === option.id;
                          return (
                            <div
                              key={option.id}
                              className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer text-sm ${
                                isSelected
                                  ? 'bg-orange-50 border-orange-300'
                                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                              }`}
                              onClick={() => setSelectedFormulaOptions(prev => ({
                                ...prev,
                                [group.id]: option.id
                              }))}
                            >
                              <div className="flex items-center flex-1 min-w-0">
                                <span className={`w-4 h-4 rounded-full border-2 mr-2 flex items-center justify-center flex-shrink-0 ${
                                  isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300'
                                }`}>
                                  {isSelected && <span className="text-white text-xs">✓</span>}
                                </span>
                                <span className="font-medium truncate">{option.nom || option.name || 'Option'}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ));
                }
                
                return null;
              })()
            )}

            {/* Choix de boisson - VERSION COMPACTE */}
            {/* IMPORTANT: Afficher la sélection de boisson UNIQUEMENT pour les formules ET les menus (détectés par nom/catégorie) */}
            {/* Un menu est identifié par: is_formula=true OU (category contient "menu" OU nom contient "menu") */}
            {/* Les sandwiches et burgers seuls n'affichent PAS la sélection de boisson */}
            {((item.is_formula) || (item.category?.toLowerCase().includes('menu') || item.nom?.toLowerCase().includes('menu'))) && item.drink_options && item.drink_options.length > 0 && (
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

          {/* Viandes - VERSION MINI - TOUJOURS AFFICHER POUR TACOS */}
          {((meatOptions.length > 0 || (item.category && item.category.toLowerCase().includes('tacos'))) || (item.nom && item.nom.toLowerCase().includes('tacos'))) && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold mb-1.5">
                Viandes
                {(item.max_meats || item.max_meat_count) && (
                  <span className="text-gray-500 font-normal ml-1">
                    (Max {(item.max_meats || item.max_meat_count)})
                  </span>
                )}
                {item.requires_meat_selection && <span className="text-red-500">*</span>}
              </h3>
              {meatOptions.length === 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  ⚠️ Aucune option de viande trouvée. Vérifiez les logs de la console.
                  <br />
                  <small>Item: {item.nom || 'N/A'}, meat_options type: {typeof item.meat_options}, isArray: {Array.isArray(item.meat_options) ? 'true' : 'false'}</small>
                </div>
              ) : (
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
                        <span className="text-xs ml-2">+{parseFloat(meat.prix || meat.price || 0).toFixed(2)} &euro;</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sauces - VERSION MINI - TOUJOURS AFFICHER POUR TACOS */}
          {((sauceOptions.length > 0 || (item.category && item.category.toLowerCase().includes('tacos')) || (item.nom && item.nom.toLowerCase().includes('tacos'))) && (item.max_sauces || item.max_sauce_count) !== 0) && (
            <div className="mb-2">
              <h3 className="text-sm font-semibold mb-1.5">Sauces {item.requires_sauce_selection && <span className="text-red-500">*</span>}</h3>
              {sauceOptions.length === 0 ? (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                  ⚠️ Aucune option de sauce trouvée. Vérifiez les logs de la console.
                  <br />
                  <small>Item: {item.nom || 'N/A'}, sauce_options type: {typeof item.sauce_options}, isArray: {Array.isArray(item.sauce_options) ? 'true' : 'false'}</small>
                </div>
              ) : (
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
          {itemIngredients.length > 0 && (
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
            <span>AJOUTER AU PANIER • {calculateTotalPrice().toFixed(2)}€</span>
          </button>
        </div>
      </div>
    </>
  );

  // Rendre la modal dans le body via un portail
  return createPortal(modalContent, document.body);
}
