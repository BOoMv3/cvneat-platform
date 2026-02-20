'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { safeLocalStorage } from '../../../lib/localStorage';
import { FaStar, FaClock, FaMotorcycle, FaPlus, FaMinus, FaShoppingCart, FaMapMarkerAlt } from 'react-icons/fa';
import Modal from '../../components/Modal';
import RestaurantBanner from '@/components/RestaurantBanner';
import MenuItem from '@/components/MenuItem';
import MenuByCategories from '@/components/MenuByCategories';
import ReviewsSection from '@/components/ReviewsSection';
import StarRating from '@/components/StarRating';
import { FacebookPixelEvents } from '@/components/FacebookPixel';
import PriceInfoBanner from '@/components/PriceInfoBanner';

export default function RestaurantDetail({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [menuCategoryOrder, setMenuCategoryOrder] = useState(null);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Extraire l'ID depuis params ou depuis l'URL en fallback (pour Capacitor)
  const getRestaurantId = () => {
    if (params?.id) return params.id;
    if (typeof window !== 'undefined') {
      const match = window.location.pathname.match(/\/restaurants\/([^\/]+)/);
      if (match && match[1]) return match[1];
    }
    return null;
  };
  
  const restaurantId = getRestaurantId();
  const [showCartModal, setShowCartModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(null); // Pas de frais jusqu'à ce qu'une adresse soit sélectionnée
  const [deliveryInfoLoading, setDeliveryInfoLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [favorites, setFavorites] = useState([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [restaurantHours, setRestaurantHours] = useState([]);
  const [isRestaurantOpen, setIsRestaurantOpen] = useState(true);
  const [isManuallyClosed, setIsManuallyClosed] = useState(false);
  const [comboMenus, setComboMenus] = useState([]);
  const [comboLoading, setComboLoading] = useState(true);
  const [comboError, setComboError] = useState(null);
  const [showComboModal, setShowComboModal] = useState(false);
  const [activeCombo, setActiveCombo] = useState(null);
  const [comboSelections, setComboSelections] = useState({});
  const [comboQuantity, setComboQuantity] = useState(1);

  const getStepKey = (step, index) => step?.id || `step-${index}`;

  const initializeComboSelections = (combo) => {
    if (!combo?.steps || !Array.isArray(combo.steps)) return {};
    const initial = {};
    combo.steps.forEach((step, index) => {
      const key = getStepKey(step, index);
      initial[key] = { options: [] };
    });
    return initial;
  };

  const openComboModal = (combo) => {
    if (!combo) return;
    setActiveCombo(combo);
    setComboSelections(initializeComboSelections(combo));
    setComboQuantity(1);
    setShowComboModal(true);
  };

  const closeComboModal = () => {
    setShowComboModal(false);
    setActiveCombo(null);
    setComboSelections({});
    setComboQuantity(1);
  };

  const getStepSelections = (step, stepIndex) => {
    const key = getStepKey(step, stepIndex);
    return comboSelections[key]?.options || [];
  };

  const isOptionSelected = (step, option, stepIndex) => {
    if (!option) return false;
    return getStepSelections(step, stepIndex).some(sel => sel.optionId === option.id);
  };

  const handleToggleComboOption = (step, option, stepIndex) => {
    if (!activeCombo || !step || !option || option.disponible === false) return;

    setComboSelections((prev) => {
      const key = getStepKey(step, stepIndex);
      const current = prev[key]?.options || [];
      const existingIndex = current.findIndex(sel => sel.optionId === option.id);
      let updatedOptions = [...current];

      if (existingIndex !== -1) {
        updatedOptions.splice(existingIndex, 1);
      } else {
        const max = step?.max_selections ?? 1;
        if (max === 0) {
          return prev;
        }
        if (max === 1) {
          updatedOptions = [];
        } else if (max && current.length >= max) {
          return prev; // ne pas dépasser le maximum
        }

        // Ne pas sélectionner automatiquement une variante - l'utilisateur doit choisir explicitement
        // Seulement si une variante a explicitement is_default = true, on la prend
        const defaultVariant = option.variants?.length
          ? option.variants.find(v => v.is_default === true) || null
          : null;

        updatedOptions = [
          ...updatedOptions,
          {
            optionId: option.id,
            stepId: step.id,
            option,
            variantId: defaultVariant?.id || null,
            variant: defaultVariant || null,
            removedIngredients: []
          }
        ];
      }

      return {
        ...prev,
        [key]: {
          options: updatedOptions
        }
      };
    });
  };

  const handleVariantChange = (step, option, variant, stepIndex) => {
    setComboSelections((prev) => {
      const key = getStepKey(step, stepIndex);
      const current = prev[key]?.options || [];
      if (!current.length) return prev;

      const updated = current.map(sel =>
        sel.optionId === option.id
          ? {
              ...sel,
              variantId: variant?.id || null,
              variant: variant || null
            }
          : sel
      );

      return {
        ...prev,
        [key]: {
          options: updated
        }
      };
    });
  };

  const getSelectedVariant = (step, option, stepIndex) => {
    const selected = getStepSelections(step, stepIndex).find(sel => sel.optionId === option.id);
    return selected?.variant || null;
  };

  const getRemovedIngredientsForSelection = (step, option, stepIndex) => {
    const selected = getStepSelections(step, stepIndex).find(sel => sel.optionId === option.id);
    return selected?.removedIngredients || [];
  };

  const isIngredientRemovedForSelection = (step, option, ingredientId, stepIndex) => {
    return getRemovedIngredientsForSelection(step, option, stepIndex).includes(ingredientId);
  };

  const handleToggleComboIngredient = (step, option, ingredient, stepIndex) => {
    if (!ingredient || ingredient.removable === false) {
      return;
    }

    setComboSelections((prev) => {
      const key = getStepKey(step, stepIndex);
      const current = prev[key]?.options || [];
      const updated = current.map((selection) => {
        if (selection.optionId !== option.id) return selection;
        const removed = selection.removedIngredients || [];
        const updatedRemoved = removed.includes(ingredient.id)
          ? removed.filter((id) => id !== ingredient.id)
          : [...removed, ingredient.id];
        return {
          ...selection,
          removedIngredients: updatedRemoved
        };
      });

      return {
        ...prev,
        [key]: {
          options: updated
        }
      };
    });
  };

  const loadComboMenus = async (restaurantId) => {
    if (!restaurantId) {
      setComboMenus([]);
      setComboLoading(false);
      return;
    }

    setComboLoading(true);
    setComboError(null);

    try {
      const response = await fetch(`/api/partner/menu-combos?restaurantId=${restaurantId}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement des menus composés');
      }

      const data = await response.json();
      const combos = Array.isArray(data) ? data.filter(combo => combo?.actif !== false) : [];
      setComboMenus(combos);
    } catch (err) {
      console.error('Erreur récupération menus composés:', err);
      setComboMenus([]);
      setComboError(err.message || 'Impossible de charger les menus composés');
    } finally {
      setComboLoading(false);
    }
  };

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    fetchRestaurantDetails();
    loadCartFromStorage();
    
    // Charger l'état des favoris
    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    setFavorites(favorites);
    setIsFavorite(favorites.includes(restaurantId));
    
    // Rafraîchir le statut d'ouverture toutes les minutes
    const statusInterval = setInterval(() => {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/restaurants/${restaurantId}/hours`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            setIsRestaurantOpen(data.isOpen === true);
            // Mettre à jour isManuallyClosed pour éviter incohérence (affichage fermé/ouvert qui clignote)
            setIsManuallyClosed(data.reason === 'manual' || data.isManuallyClosed === true);
            console.log('Statut rafraîchi:', data);
          }
        } catch (err) {
          console.error('Erreur rafraîchissement statut:', err);
        }
      };
      checkStatus();
    }, 60000); // Toutes les minutes
    
    // Subscription Supabase Realtime pour les menus (mise à jour automatique)
    const menuChannel = supabase
      .channel(`restaurant_${restaurantId}_menu`)
      .on('postgres_changes', 
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'menus',
          filter: `restaurant_id=eq.${restaurantId}`
        },
        (payload) => {
          console.log('🔄 Menu mis à jour en temps réel:', payload);
          // Recharger le menu
          fetch(`/api/restaurants/${restaurantId}/menu`)
            .then(res => res.json())
            .then(menuData => {
              setMenu(Array.isArray(menuData) ? menuData : []);
              console.log('✅ Menu rechargé automatiquement');
            })
            .catch(err => console.error('Erreur rechargement menu:', err));
        }
      )
      .subscribe((status) => {
        console.log('📡 Statut subscription menu:', status);
      });
    
    return () => {
      clearInterval(statusInterval);
      supabase.removeChannel(menuChannel);
    };
  }, [restaurantId]);

  useEffect(() => {
    // Sauvegarder le panier a chaque modification
    if (!loading) {
      saveCartToStorage();
    }
  }, [cart]);

  // Charger l'adresse par défaut si connecté
  useEffect(() => {
    if (user) {
      (async () => {
        const { data: userAddress } = await supabase
          .from('user_addresses')
          .select('address, city, postal_code')
          .eq('user_id', user.id)
          .eq('is_default', true)
          .single();
        if (userAddress) {
          setDeliveryAddress(`${userAddress.address}, ${userAddress.postal_code} ${userAddress.city}`);
        }
      })();
    }
  }, [user]);

  // Calcul dynamique des frais de livraison
  useEffect(() => {
    const fetchDeliveryFee = async () => {
      if (!restaurant || !deliveryAddress) return;
      setDeliveryInfoLoading(true);
      try {
        const restaurantAddressString = (() => {
          const street = restaurant.adresse;
          const cityBlock = [restaurant.code_postal, restaurant.ville].filter(Boolean).join(' ').trim();
          const parts = [street, cityBlock].filter(Boolean);
          return parts.length ? `${parts.join(', ')}, France` : 'France';
        })();

        const response = await fetch('/api/delivery/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            restaurantAddress: restaurantAddressString,
            deliveryAddress: deliveryAddress,
            orderAmount: getSubtotal(), // On envoie le montant du panier
            perKmRate: restaurant.frais_livraison_km ?? restaurant.frais_livraison_par_km ?? restaurant.delivery_fee_per_km ?? restaurant.tarif_kilometre ?? restaurant.per_km_fee,
            baseFee: restaurant.frais_livraison_base ?? restaurant.frais_livraison_minimum ?? restaurant.frais_livraison,
            freeDeliveryThreshold: restaurant.livraison_gratuite_seuil ?? restaurant.free_delivery_threshold
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.livrable) {
            setDeliveryFee(data.frais_livraison);
          } else {
            setDeliveryFee(null);
          }
        } else {
          setDeliveryFee(null);
        }
      } catch (e) {
        setDeliveryFee(null);
      } finally {
        setDeliveryInfoLoading(false);
      }
    };
    fetchDeliveryFee();
    // On déclenche le calcul à chaque changement du restaurant, de l'adresse ou du panier
  }, [restaurant, deliveryAddress, cart]);

  const handleToggleFavorite = () => {
    const currentFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    let newIsFavorite;
    
    if (isFavorite) {
      // Retirer des favoris
      newFavorites = currentFavorites.filter(id => id !== restaurantId);
      newIsFavorite = false;
    } else {
      // Ajouter aux favoris
      newFavorites = [...currentFavorites, restaurantId];
      newIsFavorite = true;
    }
    
    // Mettre à jour localStorage et l'état local
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    setIsFavorite(newIsFavorite);
  };

  const loadCartFromStorage = () => {
    const storedCart = safeLocalStorage.getJSON('cart');
    if (storedCart) {
      // S'assurer que le panier correspond au restaurant actuel
      if (storedCart.restaurant?.id === parseInt(restaurantId, 10)) {
        setCart(storedCart.items || []);
      } else {
        // Le panier concerne un autre restaurant, on le vide
        safeLocalStorage.removeItem('cart');
      }
    }
  };

  const saveCartToStorage = () => {
    const cartData = {
      items: cart,
      restaurant: restaurant,
      frais_livraison: deliveryFee || 2.50
    };
    safeLocalStorage.setJSON('cart', cartData);
  };
  
  const fetchRestaurantDetails = async () => {
    try {
      setLoading(true);
      const [restaurantResponse, menuResponse, categoriesResponse, hoursResponse, openStatusResponse] = await Promise.all([
        fetch(`/api/restaurants/${restaurantId}`),
        fetch(`/api/restaurants/${restaurantId}/menu`),
        fetch(`/api/restaurants/${restaurantId}/categories`),
        fetch(`/api/restaurants/${restaurantId}/hours`),
        fetch(`/api/restaurants/${restaurantId}/hours`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);
      if (!restaurantResponse.ok) throw new Error('Erreur de chargement du restaurant');
      if (!menuResponse.ok) throw new Error('Erreur de chargement du menu');
      
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
      let categoriesData = [];
      if (categoriesResponse.ok) {
        try {
          categoriesData = await categoriesResponse.json();
        } catch (e) {
          console.warn('Erreur parsing catégories:', e);
        }
      }
      let hoursData = { hours: [] };
      if (hoursResponse.ok) {
        try {
          hoursData = await hoursResponse.json();
        } catch (e) {
          console.error('Erreur parsing heures:', e);
        }
      } else {
        console.warn('Erreur récupération horaires:', hoursResponse.status);
      }
      
      let openStatusData = { isOpen: false }; // Par défaut FERMÉ si pas de réponse
      if (openStatusResponse.ok) {
        try {
          openStatusData = await openStatusResponse.json();
          console.log('✅ Statut ouvert reçu:', openStatusData);
        } catch (e) {
          console.error('❌ Erreur parsing statut:', e);
          openStatusData = { isOpen: false };
        }
      } else {
        console.warn('⚠️ Erreur récupération statut:', openStatusResponse.status, openStatusResponse.statusText);
      }
      
      setRestaurant(restaurantData);
      setMenu(Array.isArray(menuData) ? menuData : []);
      setMenuCategoryOrder(
        Array.isArray(categoriesData) && categoriesData.length > 0 ? categoriesData : null
      );
      setRestaurantHours(hoursData.hours || []);
      
      // Track Facebook Pixel - ViewRestaurant
      if (restaurantData) {
        FacebookPixelEvents.viewRestaurant(restaurantData);
      }
      
      // Forcer le booléen strict - Par défaut FERMÉ si pas explicitement ouvert
      const isOpen = openStatusData.isOpen === true;
      const fm = restaurantData.ferme_manuellement;
      const fmTruthy = fm === true || fm === 'true' || fm === 1 || fm === '1';
      const isManuallyClosed = openStatusData.reason === 'manual' || 
                               openStatusData.isManuallyClosed === true ||
                               hoursData.is_manually_closed === true || 
                               fmTruthy;
      setIsRestaurantOpen(isOpen);
      setIsManuallyClosed(isManuallyClosed);
      
      // Debug: afficher les horaires récupérées
      console.log('📅 Horaires récupérées:', hoursData.hours);
      console.log('📊 Statut ouvert reçu:', openStatusData);
      console.log('🔓 isRestaurantOpen sera:', isOpen);
      console.log('🔒 isManuallyClosed sera:', hoursData.is_manually_closed || restaurantData.ferme_manuellement || false);

      await loadComboMenus(restaurantData.id || restaurantId);
    } catch (err) {
      setComboLoading(false);
      setComboMenus([]);
      setError(`Erreur lors du chargement: ${err.message || 'Erreur inconnue'}`);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item, supplements = [], size = null, quantityToAdd = 1) => {
    // Vérifier si le restaurant est ouvert avant d'ajouter au panier
    if (!isRestaurantOpen || isManuallyClosed) {
      alert('Le restaurant est actuellement fermé. Vous ne pouvez pas ajouter d\'articles au panier.');
      return;
    }
    
    setCart(prevCart => {
      // Si l'item a déjà une propriété quantity (venant de la modal), l'utiliser
      const finalQuantity = item.quantity || quantityToAdd;
      
      // IMPORTANT: Utiliser les suppléments passés en paramètre en priorité
      // Si aucun supplément n'est passé explicitement, utiliser ceux de l'item seulement si c'est une modal
      // Sinon, commencer avec un tableau vide pour éviter de réutiliser les suppléments d'une instance précédente
      const itemSupplements = supplements.length > 0 
        ? supplements 
        : (item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0 && item._fromModal)
          ? item.supplements 
          : [];
      const itemSize = size !== null ? size : (item.size || null);
      
      // Récupérer les customisations depuis l'item (viandes, sauces, ingrédients retirés)
      const itemCustomizations = item.customizations || {};
      const itemSelectedMeats = itemCustomizations.selectedMeats || [];
      const itemSelectedSauces = itemCustomizations.selectedSauces || [];
      const itemRemovedIngredients = itemCustomizations.removedIngredients || [];
      
      // Normaliser les suppléments pour la comparaison (trier par ID pour éviter les problèmes d'ordre)
      const normalizedSupplements = [...itemSupplements].sort((a, b) => {
        const idA = a.id || a.nom || a.name || '';
        const idB = b.id || b.nom || b.name || '';
        return idA.localeCompare(idB);
      });

      // Normaliser les viandes sélectionnées pour la comparaison
      const normalizedMeats = [...itemSelectedMeats].sort((a, b) => {
        const idA = a.id || a.nom || a.name || '';
        const idB = b.id || b.nom || b.name || '';
        return idA.localeCompare(idB);
      });

      // Normaliser les sauces sélectionnées pour la comparaison
      const normalizedSauces = [...itemSelectedSauces].sort((a, b) => {
        const idA = a.id || a.nom || a.name || '';
        const idB = b.id || b.nom || b.name || '';
        return idA.localeCompare(idB);
      });

      // Normaliser les ingrédients retirés pour la comparaison
      const normalizedRemovedIngredients = [...itemRemovedIngredients].sort((a, b) => {
        const idA = a.id || a.nom || a.name || '';
        const idB = b.id || b.nom || b.name || '';
        return idA.localeCompare(idB);
      });
      
      // Créer un identifiant unique basé sur l'ID, les suppléments, la taille, et les customisations
      // IMPORTANT: Un item avec customisations différentes est un item différent
      const itemKey = JSON.stringify({
        id: item.id,
        supplements: normalizedSupplements.map(s => ({ 
          id: s.id || s.nom || s.name || '', 
          nom: s.nom || s.name || '', 
          prix: parseFloat(s.prix || s.price || 0) 
        })),
        size: itemSize,
        customizations: {
          selectedMeats: normalizedMeats.map(m => ({ 
            id: m.id || m.nom || m.name || '', 
            nom: m.nom || m.name || '' 
          })),
          selectedSauces: normalizedSauces.map(s => ({ 
            id: s.id || s.nom || s.name || '', 
            nom: s.nom || s.name || '' 
          })),
          removedIngredients: normalizedRemovedIngredients.map(i => ({ 
            id: i.id || i.nom || i.name || '', 
            nom: i.nom || i.name || '' 
          }))
        }
      });
      
      // Vérifier si l'article avec ces mêmes suppléments, taille et customisations existe déjà
      const existingItemIndex = prevCart.findIndex(cartItem => {
        // Si les IDs ne correspondent pas, ce n'est pas le même item
        if (cartItem.id !== item.id) return false;
        
        const cartItemSupplements = cartItem.supplements || [];
        const normalizedCartSupplements = [...cartItemSupplements].sort((a, b) => {
          const idA = a.id || a.nom || a.name || '';
          const idB = b.id || b.nom || b.name || '';
          return idA.localeCompare(idB);
        });

        // Récupérer les customisations du panier
        const cartItemCustomizations = cartItem.customizations || {};
        const cartItemMeats = cartItemCustomizations.selectedMeats || [];
        const cartItemSauces = cartItemCustomizations.selectedSauces || [];
        const cartItemRemovedIngredients = cartItemCustomizations.removedIngredients || [];

        // Normaliser les customisations du panier
        const normalizedCartMeats = [...cartItemMeats].sort((a, b) => {
          const idA = a.id || a.nom || a.name || '';
          const idB = b.id || b.nom || b.name || '';
          return idA.localeCompare(idB);
        });
        const normalizedCartSauces = [...cartItemSauces].sort((a, b) => {
          const idA = a.id || a.nom || a.name || '';
          const idB = b.id || b.nom || b.name || '';
          return idA.localeCompare(idB);
        });
        const normalizedCartRemovedIngredients = [...cartItemRemovedIngredients].sort((a, b) => {
          const idA = a.id || a.nom || a.name || '';
          const idB = b.id || b.nom || b.name || '';
          return idA.localeCompare(idB);
        });
        
        // Comparer tous les éléments
        const cartItemKey = JSON.stringify({
          id: cartItem.id,
          supplements: normalizedCartSupplements.map(s => ({ 
            id: s.id || s.nom || s.name || '', 
            nom: s.nom || s.name || '', 
            prix: parseFloat(s.prix || s.price || 0) 
          })),
          size: cartItem.size || null,
          customizations: {
            selectedMeats: normalizedCartMeats.map(m => ({ 
              id: m.id || m.nom || m.name || '', 
              nom: m.nom || m.name || '' 
            })),
            selectedSauces: normalizedCartSauces.map(s => ({ 
              id: s.id || s.nom || s.name || '', 
              nom: s.nom || s.name || '' 
            })),
            removedIngredients: normalizedCartRemovedIngredients.map(i => ({ 
              id: i.id || i.nom || i.name || '', 
              nom: i.nom || i.name || '' 
            }))
          }
        });
        return cartItemKey === itemKey;
      });
      
      if (existingItemIndex !== -1) {
        // Incrémenter la quantité si l'article existe déjà avec les mêmes suppléments/taille
        return prevCart.map((cartItem, index) =>
          index === existingItemIndex
            ? { ...cartItem, quantity: (cartItem.quantity || 1) + finalQuantity }
            : cartItem
        );
      } else {
        // Ajouter un nouvel article avec suppléments, taille et customisations
        // IMPORTANT: Chaque item garde ses propres suppléments et customisations indépendamment
        const newItem = {
          ...item,
          quantity: finalQuantity,
          supplements: itemSupplements, // Conserver les suppléments originaux (pas normalisés)
          size: itemSize,
          customizations: itemCustomizations // Conserver les customisations (viandes, sauces, ingrédients retirés)
        };
        return [...prevCart, newItem];
      }
    });
    
    // Track Facebook Pixel - AddToCart
    FacebookPixelEvents.addToCart({
      ...item,
      quantity: finalQuantity
    });
    
    setLastAddedItem(item);
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 3000);
  };

  const removeFromCart = (itemId, supplements = [], size = null) => {
    setCart(prevCart => {
      // Si supplements et size ne sont pas fournis, utiliser l'index ou trouver le premier item avec cet ID
      if (!supplements.length && !size) {
        // Si on a un index (passé comme itemId), l'utiliser directement
        const index = typeof itemId === 'number' ? itemId : prevCart.findIndex(item => item.id === itemId);
        if (index !== -1 && index < prevCart.length) {
          const item = prevCart[index];
          if (item.quantity === 1) {
            return prevCart.filter((_, i) => i !== index);
          }
          return prevCart.map((cartItem, i) =>
            i === index
              ? { ...cartItem, quantity: cartItem.quantity - 1 }
              : cartItem
          );
        }
      }
      
      // Normaliser les suppléments pour la comparaison (comme dans addToCart)
      const normalizedSupplements = [...(supplements || [])].sort((a, b) => {
        const idA = a.id || a.nom || '';
        const idB = b.id || b.nom || '';
        return idA.localeCompare(idB);
      });
      
      // Créer un identifiant unique basé sur l'ID, les suppléments (normalisés) et la taille
      const itemKey = JSON.stringify({
        id: itemId,
        supplements: normalizedSupplements.map(s => ({ id: s.id || s.nom, nom: s.nom || s.name, prix: s.prix || s.price })),
        size: size
      });
      
      // Trouver l'article exact avec ces mêmes suppléments et taille
      const existingItemIndex = prevCart.findIndex(cartItem => {
        const cartItemSupplements = cartItem.supplements || [];
        const normalizedCartSupplements = [...cartItemSupplements].sort((a, b) => {
          const idA = a.id || a.nom || '';
          const idB = b.id || b.nom || '';
          return idA.localeCompare(idB);
        });
        
        const cartItemKey = JSON.stringify({
          id: cartItem.id,
          supplements: normalizedCartSupplements.map(s => ({ id: s.id || s.nom, nom: s.nom || s.name, prix: s.prix || s.price })),
          size: cartItem.size || null
        });
        return cartItemKey === itemKey;
      });
      
      if (existingItemIndex === -1) return prevCart;
      
      const existingItem = prevCart[existingItemIndex];
      if (existingItem.quantity === 1) {
        // Retirer complètement l'article
        return prevCart.filter((_, index) => index !== existingItemIndex);
      }
      // Décrémenter la quantité
      return prevCart.map((cartItem, index) =>
        index === existingItemIndex
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      );
    });
  };

  // Fonction pour mettre à jour la quantité d'un item spécifique
  const updateQuantity = (itemId, newQuantity, supplements = [], size = null) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId, supplements, size);
      return;
    }
    
    setCart(prevCart => {
      // Si on a un index (passé comme itemId), l'utiliser directement
      if (typeof itemId === 'number' && itemId < prevCart.length) {
        return prevCart.map((cartItem, index) =>
          index === itemId
            ? { ...cartItem, quantity: newQuantity }
            : cartItem
        );
      }
      
      // Sinon, utiliser la même logique de comparaison que addToCart
      const normalizedSupplements = [...(supplements || [])].sort((a, b) => {
        const idA = a.id || a.nom || '';
        const idB = b.id || b.nom || '';
        return idA.localeCompare(idB);
      });
      
      const itemKey = JSON.stringify({
        id: itemId,
        supplements: normalizedSupplements.map(s => ({ id: s.id || s.nom, nom: s.nom || s.name, prix: s.prix || s.price })),
        size: size
      });
      
      const existingItemIndex = prevCart.findIndex(cartItem => {
        const cartItemSupplements = cartItem.supplements || [];
        const normalizedCartSupplements = [...cartItemSupplements].sort((a, b) => {
          const idA = a.id || a.nom || '';
          const idB = b.id || b.nom || '';
          return idA.localeCompare(idB);
        });
        
        const cartItemKey = JSON.stringify({
          id: cartItem.id,
          supplements: normalizedCartSupplements.map(s => ({ id: s.id || s.nom, nom: s.nom || s.name, prix: s.prix || s.price })),
          size: cartItem.size || null
        });
        return cartItemKey === itemKey;
      });
      
      if (existingItemIndex === -1) return prevCart;
      
      return prevCart.map((cartItem, index) =>
        index === existingItemIndex
          ? { ...cartItem, quantity: newQuantity }
          : cartItem
      );
    });
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => {
      const itemPrice = parseFloat(item.prix || item.price || 0);
      const itemQuantity = parseInt(item.quantity || 1, 10);
      
      // Calculer le prix des suppléments si présents
      let supplementsPrice = 0;
      if (item.supplements && Array.isArray(item.supplements)) {
        supplementsPrice = item.supplements.reduce((sum, sup) => {
          return sum + (parseFloat(sup.prix || sup.price || 0) || 0);
        }, 0);
      }
      
      // Calculer le prix des viandes sélectionnées
      let meatsPrice = 0;
      if (item.customizations && item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats)) {
        meatsPrice = item.customizations.selectedMeats.reduce((sum, meat) => {
          return sum + (parseFloat(meat.prix || meat.price || 0) || 0);
        }, 0);
      }
      
      // Calculer le prix des sauces sélectionnées
      let saucesPrice = 0;
      if (item.customizations && item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces)) {
        saucesPrice = item.customizations.selectedSauces.reduce((sum, sauce) => {
          return sum + (parseFloat(sauce.prix || sauce.price || 0) || 0);
        }, 0);
      }
      
      // Calculer le prix de la taille si présente
      let sizePrice = 0;
      if (item.size && item.size.prix) {
        sizePrice = parseFloat(item.size.prix) || 0;
      } else if (item.prix_taille) {
        sizePrice = parseFloat(item.prix_taille) || 0;
      }
      
      const totalItemPrice = (itemPrice + supplementsPrice + meatsPrice + saucesPrice + sizePrice) * itemQuantity;
      return total + totalItemPrice;
    }, 0);
  };

  const getDeliveryFee = () => {
    // La logique de calcul avancee pourrait etre ici si necessaire.
    // Pour l'instant on se base sur les donnees du restaurant.
    return restaurant?.deliveryFee || restaurant?.frais_livraison || 2.50;
  };

  const getTotal = () => {
    return getSubtotal() + (deliveryFee || 0);
  };

  const comboValidation = useMemo(() => {
    if (!activeCombo) return { isValid: false, errors: [] };

    const errors = [];
    activeCombo.steps?.forEach((step, index) => {
      const key = getStepKey(step, index);
      const selections = comboSelections[key]?.options || [];
      const count = selections.length;
      const rawMin = step?.min_selections;
      const rawMax = step?.max_selections;
      const min = Math.max(parseInt(rawMin, 10) || 0, 0);
      const max = rawMax === null || rawMax === undefined ? null : Math.max(parseInt(rawMax, 10) || 0, 0);

      if (min === 0 && (max === 0 || max === null)) {
        return;
      }

      if (count < min) {
        errors.push(
          `Sélectionnez au moins ${min} option${min > 1 ? 's' : ''} pour ${step.title || `l'étape ${index + 1}`}`
        );
      }

      if (max !== null && count > max) {
        errors.push(
          `Vous ne pouvez sélectionner que ${max} option${max > 1 ? 's' : ''} pour ${step.title || `l'étape ${index + 1}`}`
        );
      }

      selections.forEach((selection) => {
        if (selection.option?.variants?.length && selection.variantId === null) {
          errors.push(`Choisissez une variante pour ${selection.option?.nom || "l'option sélectionnée"}`);
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }, [activeCombo, comboSelections]);

  const comboTotalPrice = useMemo(() => {
    if (!activeCombo) return 0;
    let total = parseFloat(activeCombo.prix_base || 0) || 0;

    activeCombo.steps?.forEach((step, index) => {
      const key = getStepKey(step, index);
      const selections = comboSelections[key]?.options || [];
      selections.forEach((selection) => {
        const optionPrice = parseFloat(selection.option?.prix_supplementaire || 0) || 0;
        const variantPrice = parseFloat(selection.variant?.prix_supplementaire || 0) || 0;
        total += optionPrice + variantPrice;
      });
    });

    return Math.max(total, 0);
  }, [activeCombo, comboSelections]);

  const handleAddComboToCart = () => {
    if (!activeCombo) return;
    const validation = comboValidation;
    if (!validation.isValid) {
      alert(validation.errors.join('\n'));
      return;
    }

    const supplements = [];
    const comboDetails = [];

    activeCombo.steps?.forEach((step, index) => {
      const key = getStepKey(step, index);
      const selections = comboSelections[key]?.options || [];

      selections.forEach((selection) => {
        const option = selection.option || step.options?.find(opt => opt.id === selection.optionId);
        if (!option) return;
        const variant = selection.variant || option.variants?.find(v => v.id === selection.variantId);

        const labelParts = [step.title, option.nom];
        // Ne pas ajouter la variante au label si elle n'est pas explicitement sélectionnée
        // (variant est null si aucune variante n'a été choisie)
        if (variant?.nom && selection.variantId) {
          labelParts.push(variant.nom);
        }
        const label = labelParts.filter(Boolean).join(' · ');

        const optionPrice = parseFloat(option?.prix_supplementaire || 0) || 0;
        const variantPrice = parseFloat(variant?.prix_supplementaire || 0) || 0;
        const supplementPrice = optionPrice + variantPrice;

        supplements.push({
          id: `${getStepKey(step, index)}-${option.id}${variant ? `-${variant.id}` : ''}`,
          nom: label,
          prix: supplementPrice
        });

        const removedIngredientIds = Array.isArray(selection.removedIngredients) ? selection.removedIngredients : [];
        const removedIngredients = removedIngredientIds
          .map((ingredientId) => {
            const ingredient = option.base_ingredients?.find((ing) => {
              const possibleId = ing.id || `${option.id}-ingredient-${ing.nom}`;
              return possibleId === ingredientId;
            });
            return ingredient
              ? { id: ingredientId, nom: ingredient.nom }
              : { id: ingredientId, nom: 'Ingrédient retiré' };
          })
          .filter(Boolean);

        comboDetails.push({
          stepTitle: step.title,
          optionName: option.nom,
          variantName: variant?.nom || null,
          optionPrice,
          variantPrice,
          removedIngredients
        });
      });
    });

    const cartItem = {
      id: `combo-${activeCombo.id}`,
      nom: activeCombo.nom,
      prix: parseFloat(activeCombo.prix_base || 0) || 0,
      type: 'combo',
      comboId: activeCombo.id,
      comboName: activeCombo.nom,
      comboDetails,
      _fromModal: true
    };

    addToCart(cartItem, supplements, null, Math.max(1, comboQuantity || 1));
    closeComboModal();
  };

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/restaurant-view?id=${restaurantId}`));
      return;
    }
    
    // Vérifier si le restaurant est ouvert
    if (!isRestaurantOpen || isManuallyClosed) {
      alert('Le restaurant est actuellement fermé. Vous ne pouvez pas passer commande.');
      return;
    }
    
    // La sauvegarde se fait via le useEffect, on peut directement aller au checkout
    router.push('/checkout');
  };

  const filteredMenu = menu.filter(item => 
    selectedCategory === 'all' || (item.category || item.categorie || 'Autres') === selectedCategory
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Une erreur est survenue</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-2">Erreur: {error}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ID du restaurant: {restaurantId}</p>
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400 font-bold">Restaurant non trouvé ou erreur de chargement.</p>
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header avec bouton de retour */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Retour à l'accueil</span>
          </button>
        </div>
      </div>

      <main className="relative container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="flex flex-col lg:flex-row lg:gap-6">
          <div className="flex-1 min-w-0">
            <RestaurantBanner
              restaurant={restaurant}
              isFavorite={isFavorite}
              onToggleFavorite={handleToggleFavorite}
              hours={restaurantHours}
              isOpen={isRestaurantOpen && !isManuallyClosed}
              isManuallyClosed={isManuallyClosed}
            />

            <PriceInfoBanner variant="compact" />

            <div className="space-y-8 sm:space-y-12 pt-12 sm:pt-14 md:pt-16">
              {(comboLoading || comboError || comboMenus.length > 0) && (
                <section className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Menus composés</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">
                      Composez un menu complet en choisissant les options proposées par le restaurant.
                    </p>
                  </div>

                  {comboLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-10 w-10 border-4 border-orange-200 border-t-orange-500"></div>
                    </div>
                  ) : comboError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 text-red-700 px-4 py-3 text-sm">
                      {comboError}
                    </div>
                  ) : comboMenus.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aucun menu composé n'est disponible pour le moment.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                      {comboMenus.map((combo, comboIndex) => {
                        const basePrice = parseFloat(combo.prix_base || 0) || 0;
                        return (
                          <article
                            key={combo.id || comboIndex}
                            className="border border-gray-200 dark:border-gray-700 rounded-2xl p-5 bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {combo.nom}
                                </h3>
                                {combo.description && (
                                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                                    {combo.description}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <span className="inline-flex items-center justify-center rounded-full bg-green-100 text-green-700 px-3 py-1 text-sm font-semibold">
                                  À partir de {basePrice.toFixed(2)}€
                                </span>
                              </div>
                            </div>

                            {Array.isArray(combo.steps) && combo.steps.length > 0 && (
                              <div className="mt-4 space-y-3">
                                {combo.steps.map((step, stepIndex) => {
                                  const min = Math.max(step?.min_selections ?? 0, 0);
                                  const max = step?.max_selections ?? null;
                                  return (
                                    <div key={step.id || stepIndex} className="flex items-start gap-3">
                                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 text-sm font-semibold">
                                        {stepIndex + 1}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="font-medium text-gray-900 dark:text-white">
                                          {step.title || `Choix ${stepIndex + 1}`}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          {min === 0 && (max === 0 || max === null)
                                            ? 'Étape facultative (aucun choix requis)'
                                            : min === max
                                              ? min === 1
                                                ? 'Sélection obligatoire de 1 option'
                                                : `Sélection obligatoire de ${min} options`
                                              : `Choisir ${min > 0 ? `au moins ${min}` : 'jusqu\'à'} ${max ? `${max} option${max > 1 ? 's' : ''}` : 'options'}`}
                                        </p>
                                        {step.description && (
                                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                            {step.description}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            <div className="mt-5 flex items-center justify-between">
                              <button
                                onClick={() => openComboModal(combo)}
                                className="inline-flex items-center justify-center rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 text-sm font-semibold transition-colors"
                              >
                                Personnaliser
                              </button>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {combo.steps?.length || 0} étape{combo.steps?.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {menu.length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                  <p>Aucun plat disponible pour ce restaurant.</p>
                </div>
              ) : (
                <MenuByCategories
                  menu={menu}
                  selectedCategory={selectedCategory}
                  onCategorySelect={setSelectedCategory}
                  onAddToCart={addToCart}
                  restaurantId={restaurantId}
                  categoryOrder={menuCategoryOrder}
                />
              )}
            </div>
          </div>

          {/* Panier desktop */}
          {cart.length > 0 && (
            <aside className="hidden lg:block w-[320px] xl:w-[360px] flex-shrink-0">
              <div className="sticky top-24 z-40 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border dark:border-gray-700 p-4 space-y-3">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Panier ({cart.reduce((sum, item) => sum + (item.quantity || 1), 0)})</h2>
                <button
                  onClick={() => setShowCartModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Voir tout
                </button>
              </div>
                <div className="space-y-2 mb-3 max-h-[50vh] overflow-y-auto pr-1">
                  {cart.slice(0, 3).map((item, idx) => {
                    const itemPrice = parseFloat(item.prix || item.price || 0);
                    const supplementsPrice = item.supplements && Array.isArray(item.supplements) 
                      ? item.supplements.reduce((sum, sup) => sum + parseFloat(sup.prix || sup.price || 0), 0)
                      : 0;
                    // Calculer le prix des viandes sélectionnées
                    const meatsPrice = item.customizations && item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats)
                      ? item.customizations.selectedMeats.reduce((sum, meat) => sum + parseFloat(meat.prix || meat.price || 0), 0)
                      : 0;
                    // Calculer le prix des sauces sélectionnées
                    const saucesPrice = item.customizations && item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces)
                      ? item.customizations.selectedSauces.reduce((sum, sauce) => sum + parseFloat(sauce.prix || sauce.price || 0), 0)
                      : 0;
                    const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
                    const totalItemPrice = itemPrice + supplementsPrice + meatsPrice + saucesPrice + sizePrice;
                    
                    return (
                      <div key={item.id || idx} className="flex items-start justify-between text-sm border-b dark:border-gray-700 pb-2">
                        <div className="flex-1 pr-2 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{item.nom || item.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {totalItemPrice.toFixed(2)}€ x{item.quantity || 1}
                          </p>
                          {item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0 && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                              +{item.supplements.length} suppl.
                            </p>
                          )}
                          {item.customizations && (
                            <>
                              {item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats) && item.customizations.selectedMeats.length > 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                  {item.customizations.selectedMeats.length} viande{item.customizations.selectedMeats.length > 1 ? 's' : ''}
                                </p>
                              )}
                              {item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces) && item.customizations.selectedSauces.length > 0 && (
                                <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                                  {item.customizations.selectedSauces.length} sauce{item.customizations.selectedSauces.length > 1 ? 's' : ''}
                                </p>
                              )}
                              {item.customizations.removedIngredients && Array.isArray(item.customizations.removedIngredients) && item.customizations.removedIngredients.length > 0 && (
                                <p className="text-xs text-orange-500 dark:text-orange-400 italic">
                                  -{item.customizations.removedIngredients.length} ingrédient{item.customizations.removedIngredients.length > 1 ? 's' : ''}
                                </p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {cart.length > 3 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center">+{cart.length - 3} autre(s) article(s)</p>
                  )}
                </div>
                <div className="border-t dark:border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between items-center mb-2 text-sm text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span className="font-bold">{deliveryFee !== null ? getTotal().toFixed(2) : getSubtotal().toFixed(2)}€</span>
                  </div>
                  <button
                    onClick={handleCheckout}
                    disabled={!isRestaurantOpen || isManuallyClosed}
                    className={`w-full py-3 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm min-h-[44px] touch-manipulation active:scale-95 ${
                      !isRestaurantOpen || isManuallyClosed
                        ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 dark:text-gray-300 cursor-not-allowed'
                        : 'bg-orange-500 dark:bg-orange-600 text-white hover:bg-orange-600 dark:hover:bg-orange-700'
                    }`}
                  >
                    <FaShoppingCart className="h-4 w-4" />
                    {!isRestaurantOpen || isManuallyClosed ? 'Fermé' : 'Commander'}
                  </button>
                </div>
              </div>
            </aside>
          )}
        </div>

        {/* Panier mobile */}
        {cart.length > 0 && (
          <div className="lg:hidden fixed inset-x-4 bottom-6 z-50">
            <button
              type="button"
              onClick={() => setShowCartModal(true)}
              className="w-full flex items-center justify-between gap-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-4 shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-300"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs uppercase tracking-wide opacity-80">Panier</span>
                <span className="text-base font-semibold">
                  {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} article{cart.reduce((sum, item) => sum + (item.quantity || 1), 0) > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center gap-2 text-lg font-bold">
                {(deliveryFee !== null ? getTotal() : getSubtotal()).toFixed(2)}€
                <FaShoppingCart className="h-4 w-4" />
              </div>
            </button>
          </div>
        )}

        {/* Panier flottant PC - Toujours visible en bas à droite */}
        {cart.length > 0 && (
          <div className="hidden lg:flex fixed bottom-6 right-6 z-50">
            <button
              type="button"
              onClick={() => setShowCartModal(true)}
              className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white px-6 py-4 shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-300 min-w-[280px]"
            >
              <div className="flex flex-col text-left">
                <span className="text-xs uppercase tracking-wide opacity-90 font-medium">Panier</span>
                <span className="text-lg font-bold">
                  {cart.reduce((sum, item) => sum + (item.quantity || 1), 0)} article{cart.reduce((sum, item) => sum + (item.quantity || 1), 0) > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-bold">
                  {(deliveryFee !== null ? getTotal() : getSubtotal()).toFixed(2)}€
                </span>
                <FaShoppingCart className="h-5 w-5 mt-1" />
              </div>
            </button>
          </div>
        )}
        {/* Modal panier */}
        {showComboModal && activeCombo && (
          <Modal onClose={closeComboModal}>
            <div className="flex flex-col gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {activeCombo.nom}
                </h2>
                {activeCombo.description && (
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    {activeCombo.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 bg-gray-50 dark:bg-gray-800/70">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Prix de base</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(parseFloat(activeCombo.prix_base || 0) || 0).toFixed(2)}€
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 dark:text-gray-300">Quantité</span>
                  <div className="flex items-center rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setComboQuantity(prev => Math.max(1, (prev || 1) - 1))}
                      className="w-10 h-10 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      <FaMinus />
                    </button>
                    <div className="w-12 text-center text-sm font-semibold text-gray-900 dark:text-white">
                      {comboQuantity}
                    </div>
                    <button
                      type="button"
                      onClick={() => setComboQuantity(prev => (prev || 1) + 1)}
                      className="w-10 h-10 flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600"
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total estimé</p>
                  <p className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                    {(comboTotalPrice * Math.max(1, comboQuantity || 1)).toFixed(2)}€
                  </p>
                </div>
              </div>

              <div className="space-y-6 pr-1">
                {Array.isArray(activeCombo.steps) && activeCombo.steps.length > 0 ? (
                  activeCombo.steps.map((step, stepIndex) => {
                    const min = Math.max(step?.min_selections ?? 0, 0);
                    const max = step?.max_selections ?? null;
                    const selections = getStepSelections(step, stepIndex);
                    const selectedCount = selections.length;
                    return (
                      <div
                        key={step.id || `combo-step-${stepIndex}`}
                        className="border border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-white dark:bg-gray-800"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Étape {stepIndex + 1} · {step.title || `Choix ${stepIndex + 1}`}
                            </h3>
                            {step.description && (
                              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                {step.description}
                              </p>
                            )}
                          </div>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {min === 0 && (max === 0 || max === null)
                              ? 'Étape facultative (aucun choix requis)'
                              : min === max
                                ? min === 1
                                  ? 'Choix obligatoire'
                                  : `Choisir exactement ${min} options`
                                : [
                                    min > 0 ? `Min ${min}` : 'Optionnel',
                                    max ? `· Max ${max}` : null
                                  ]
                                    .filter(Boolean)
                                    .join(' ')}
                          </p>
                        </div>

                        <div className="mt-4 space-y-3">
                          {Array.isArray(step.options) && step.options.length > 0 ? (
                            step.options
                              .filter(option => option && option.disponible !== false)
                              .map((option) => {
                                const selected = isOptionSelected(step, option, stepIndex);
                                const variant = getSelectedVariant(step, option, stepIndex);
                                const optionSupplement = parseFloat(option?.prix_supplementaire || 0) || 0;
                                return (
                                  <div
                                    key={option.id}
                                    className={`border rounded-xl transition-colors ${
                                      selected
                                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10'
                                        : 'border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComboOption(step, option, stepIndex)}
                                      className="w-full text-left px-4 py-3 focus:outline-none"
                                    >
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-medium text-gray-900 dark:text-white">
                                            {option.nom || 'Option'}
                                          </p>
                                          {option.description && (
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                              {option.description}
                                            </p>
                                          )}
                                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            {option.type === 'custom' ? 'Option personnalisée' : 'Article du menu'}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                            {optionSupplement > 0 ? `+${optionSupplement.toFixed(2)}€` : 'Inclus'}
                                          </p>
                                          <span
                                            className={`inline-flex items-center justify-center px-2 py-0.5 mt-2 rounded-full text-xs font-medium ${
                                              selected
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                            }`}
                                          >
                                            {selected ? 'Sélectionné' : 'Choisir'}
                                          </span>
                                        </div>
                                      </div>
                                    </button>

                                    {selected && option.variants && option.variants.length > 0 && (
                                      <div className="px-4 pb-4 pt-0 space-y-2">
                                        <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                          Variantes disponibles
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {option.variants
                                            .filter(variantOption => variantOption.disponible !== false)
                                            .map((variantOption) => {
                                              const isActiveVariant = variant?.id === variantOption.id;
                                              const variantPrice = parseFloat(variantOption.prix_supplementaire || 0) || 0;
                                              return (
                                                <button
                                                  type="button"
                                                  key={variantOption.id}
                                                  onClick={() => handleVariantChange(step, option, variantOption, stepIndex)}
                                                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                    isActiveVariant
                                                      ? 'border-orange-500 bg-orange-500 text-white'
                                                      : 'border-gray-300 text-gray-700 hover:border-orange-400 dark:border-gray-600 dark:text-gray-200'
                                                  }`}
                                                >
                                                  {variantOption.nom}
                                                  {variantPrice > 0 && ` (+${variantPrice.toFixed(2)}€)`}
                                                </button>
                                              );
                                            })}
                                        </div>
                                      </div>
                                    )}

                                    {selected && Array.isArray(option.base_ingredients) && option.base_ingredients.length > 0 && (
                                      <div className="px-4 pb-4 pt-0 space-y-2">
                                        <p className="text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                                          Ingrédients à retirer
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                          {option.base_ingredients.map((ingredient) => {
                                            const ingredientId = ingredient.id || `${option.id}-ingredient-${ingredient.nom}`;
                                            const removed = isIngredientRemovedForSelection(step, option, ingredientId, stepIndex);
                                            const disabled = ingredient.removable === false;
                                            return (
                                              <button
                                                type="button"
                                                key={ingredientId}
                                                onClick={() => handleToggleComboIngredient(step, option, { ...ingredient, id: ingredientId }, stepIndex)}
                                                disabled={disabled}
                                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                                                  removed
                                                    ? 'border-red-400 bg-red-50 text-red-600 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300'
                                                    : 'border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600 dark:border-gray-600 dark:text-gray-200 dark:hover:border-red-400'
                                                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                                              >
                                                {disabled ? `${ingredient.nom} (fixe)` : removed ? `Sans ${ingredient.nom}` : ingredient.nom}
                                              </button>
                                            );
                                          })}
                                        </div>
                                        <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                          Sélectionnez les ingrédients à retirer du burger choisi.
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                          ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Aucune option disponible pour cette étape.
                            </p>
                          )}

                          {min > 0 && selectedCount < min && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              Il manque {min - selectedCount} sélection{min - selectedCount > 1 ? 's' : ''} pour cette étape.
                            </p>
                          )}
                          {max && selectedCount > max && (
                            <p className="text-xs text-red-500 dark:text-red-400">
                              Vous avez dépassé le nombre maximum d'options pour cette étape.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-300">
                    Ce menu composé ne contient pas encore d'étapes configurées.
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-gray-200 dark:border-gray-700 pt-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {(comboTotalPrice * Math.max(1, comboQuantity || 1)).toFixed(2)}€
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={closeComboModal}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleAddComboToCart}
                    disabled={!comboValidation.isValid}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-semibold text-white transition-all transform active:scale-95 ${
                      comboValidation.isValid
                        ? 'bg-orange-500 hover:bg-orange-600 shadow-lg hover:shadow-xl'
                        : 'bg-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      <FaShoppingCart />
                      Ajouter au panier
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {showCartModal && (
          <Modal onClose={() => setShowCartModal(false)}>
            <h2 className="text-xl font-bold mb-4">Récapitulatif de votre commande</h2>
            <div className="space-y-2 mb-4">
              {cart.map((item, idx) => {
                const itemPrice = parseFloat(item.prix || item.price || 0);
                const supplementsPrice = item.supplements && Array.isArray(item.supplements) 
                  ? item.supplements.reduce((sum, sup) => sum + parseFloat(sup.prix || sup.price || 0), 0)
                  : 0;
                // Calculer le prix des viandes sélectionnées
                const meatsPrice = item.customizations && item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats)
                  ? item.customizations.selectedMeats.reduce((sum, meat) => sum + parseFloat(meat.prix || meat.price || 0), 0)
                  : 0;
                // Calculer le prix des sauces sélectionnées
                const saucesPrice = item.customizations && item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces)
                  ? item.customizations.selectedSauces.reduce((sum, sauce) => sum + parseFloat(sauce.prix || sauce.price || 0), 0)
                  : 0;
                const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
                const totalItemPrice = (itemPrice + supplementsPrice + meatsPrice + saucesPrice + sizePrice) * (item.quantity || 1);
                
                return (
                  <div key={`${item.id}-${idx}`} className="space-y-1 border-b dark:border-gray-700 pb-3">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <span className="font-medium">{item.nom || item.name} x{item.quantity || 1}</span>
                        <span className="font-bold ml-2">{totalItemPrice.toFixed(2)}€</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(idx, (item.quantity || 1) - 1)}
                          className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 dark:hover:bg-gray-600"
                        >
                          <span className="text-gray-600 dark:text-gray-300 font-bold">-</span>
                        </button>
                        <button
                          onClick={() => updateQuantity(idx, (item.quantity || 1) + 1)}
                          className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center hover:bg-orange-600"
                        >
                          <span className="font-bold">+</span>
                        </button>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                          title="Supprimer"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {item.supplements && Array.isArray(item.supplements) && item.supplements.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        <span className="font-medium">Suppléments:</span>
                        <ul className="list-disc list-inside ml-1">
                          {item.supplements.map((sup, supIdx) => (
                            <li key={supIdx}>
                              {sup.nom || sup.name} (+{(sup.prix || sup.price || 0).toFixed(2)}€)
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.customizations && item.customizations.selectedMeats && Array.isArray(item.customizations.selectedMeats) && item.customizations.selectedMeats.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        <span className="font-medium">Viandes:</span>
                        <ul className="list-disc list-inside ml-1">
                          {item.customizations.selectedMeats.map((meat, meatIdx) => (
                            <li key={meatIdx}>
                              {meat.nom || meat.name} {(meat.prix || meat.price) > 0 && `(+${(meat.prix || meat.price || 0).toFixed(2)}€)`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.customizations && item.customizations.selectedSauces && Array.isArray(item.customizations.selectedSauces) && item.customizations.selectedSauces.length > 0 && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        <span className="font-medium">Sauces:</span>
                        <ul className="list-disc list-inside ml-1">
                          {item.customizations.selectedSauces.map((sauce, sauceIdx) => (
                            <li key={sauceIdx}>
                              {sauce.nom || sauce.name} {(sauce.prix || sauce.price) > 0 && `(+${(sauce.prix || sauce.price || 0).toFixed(2)}€)`}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.customizations && item.customizations.removedIngredients && Array.isArray(item.customizations.removedIngredients) && item.customizations.removedIngredients.length > 0 && (
                      <div className="text-xs text-orange-600 dark:text-orange-400 ml-2">
                        <span className="font-medium">Ingrédients retirés:</span>
                        <ul className="list-disc list-inside ml-1">
                          {item.customizations.removedIngredients.map((ing, ingIdx) => (
                            <li key={ingIdx}>
                              {ing.nom || ing.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {item.size && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                        Taille: {item.size.nom || item.size.name || 'Taille'}
                        {item.size.prix && ` (+${item.size.prix.toFixed(2)}€)`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mb-2"><span>Sous-total</span><span>{getSubtotal().toFixed(2)}€</span></div>
            <div className="flex justify-between mb-2"><span>Frais de livraison</span><span>{deliveryFee !== null ? `${deliveryFee.toFixed(2)}€` : 'À calculer après sélection de l\'adresse'}</span></div>
            <div className="flex justify-between font-bold text-lg mb-4"><span>Total</span><span>{deliveryFee !== null ? getTotal().toFixed(2) : getSubtotal().toFixed(2)}€</span></div>
            <button onClick={() => router.push('/checkout')} className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">Valider et payer</button>
          </Modal>
        )}
        {showCartNotification && lastAddedItem && (
          <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
            <p>{lastAddedItem.nom || lastAddedItem.name} ajouté au panier !</p>
          </div>
        )}
      </main>

      {/* Section des avis */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <ReviewsSection restaurantId={restaurantId} userId={user?.id} />
      </div>
    </div>
  );
} 