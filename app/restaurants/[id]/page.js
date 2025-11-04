'use client';

import { useState, useEffect } from 'react';
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


export default function RestaurantDetail({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
    setIsFavorite(favorites.includes(params.id));
    
    // Rafraîchir le statut d'ouverture toutes les minutes
    const statusInterval = setInterval(() => {
      const checkStatus = async () => {
        try {
          const response = await fetch(`/api/restaurants/${params.id}/hours`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
          if (response.ok) {
            const data = await response.json();
            setIsRestaurantOpen(data.isOpen === true);
            console.log('Statut rafraîchi:', data);
          }
        } catch (err) {
          console.error('Erreur rafraîchissement statut:', err);
        }
      };
      checkStatus();
    }, 60000); // Toutes les minutes
    
    return () => clearInterval(statusInterval);
  }, [params.id]);

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
        const response = await fetch('/api/delivery/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantAddress: restaurant.adresse + ', ' + restaurant.code_postal + ' ' + restaurant.ville,
            deliveryAddress: deliveryAddress,
            orderAmount: getSubtotal() // On envoie le montant du panier
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
      newFavorites = currentFavorites.filter(id => id !== params.id);
      newIsFavorite = false;
    } else {
      // Ajouter aux favoris
      newFavorites = [...currentFavorites, params.id];
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
      if (storedCart.restaurant?.id === parseInt(params.id, 10)) {
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
      const [restaurantResponse, menuResponse, hoursResponse, openStatusResponse] = await Promise.all([
        fetch(`/api/restaurants/${params.id}`),
        fetch(`/api/restaurants/${params.id}/menu`),
        fetch(`/api/restaurants/${params.id}/hours`),
        fetch(`/api/restaurants/${params.id}/hours`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      ]);
      if (!restaurantResponse.ok) throw new Error('Erreur de chargement du restaurant');
      if (!menuResponse.ok) throw new Error('Erreur de chargement du menu');
      
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
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
      
      let openStatusData = { isOpen: true };
      if (openStatusResponse.ok) {
        try {
          openStatusData = await openStatusResponse.json();
        } catch (e) {
          console.error('Erreur parsing statut:', e);
        }
      }
      
      setRestaurant(restaurantData);
      setMenu(Array.isArray(menuData) ? menuData : []);
      setRestaurantHours(hoursData.hours || []);
      setIsRestaurantOpen(openStatusData.isOpen === true);
      setIsManuallyClosed(hoursData.is_manually_closed || restaurantData.ferme_manuellement || false);
      
      // Debug: afficher les horaires récupérées
      console.log('Horaires récupérées:', hoursData.hours);
      console.log('Statut ouvert:', openStatusData);
      console.log('isRestaurantOpen sera:', openStatusData.isOpen === true);
    } catch (err) {
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
      
      // Extraire les suppléments si l'item les contient déjà
      const itemSupplements = item.supplements || supplements || [];
      const itemSize = item.size || size || null;
      
      // Créer un identifiant unique basé sur l'ID, les suppléments et la taille
      const itemKey = JSON.stringify({
        id: item.id,
        supplements: itemSupplements,
        size: itemSize
      });
      
      // Vérifier si l'article avec ces mêmes suppléments et taille existe déjà
      const existingItemIndex = prevCart.findIndex(cartItem => {
        const cartItemKey = JSON.stringify({
          id: cartItem.id,
          supplements: cartItem.supplements || [],
          size: cartItem.size || null
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
        // Ajouter un nouvel article avec suppléments et taille
        const newItem = {
          ...item,
          quantity: finalQuantity,
          supplements: itemSupplements,
          size: itemSize
        };
        return [...prevCart, newItem];
      }
    });
    setLastAddedItem(item);
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 3000);
  };

  const removeFromCart = (itemId, supplements = [], size = null) => {
    setCart(prevCart => {
      // Créer un identifiant unique basé sur l'ID, les suppléments et la taille
      const itemKey = JSON.stringify({
        id: itemId,
        supplements: supplements || [],
        size: size
      });
      
      // Trouver l'article exact avec ces mêmes suppléments et taille
      const existingItemIndex = prevCart.findIndex(cartItem => {
        const cartItemKey = JSON.stringify({
          id: cartItem.id,
          supplements: cartItem.supplements || [],
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
      
      // Calculer le prix de la taille si présente
      let sizePrice = 0;
      if (item.size && item.size.prix) {
        sizePrice = parseFloat(item.size.prix) || 0;
      } else if (item.prix_taille) {
        sizePrice = parseFloat(item.prix_taille) || 0;
      }
      
      const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * itemQuantity;
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

  const handleCheckout = () => {
    if (!user) {
      router.push('/login?redirect=' + encodeURIComponent(`/restaurants/${params.id}`));
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
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">ID du restaurant: {params.id}</p>
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

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Bannière du restaurant style Uber Eats */}
        <RestaurantBanner
          restaurant={restaurant}
          isFavorite={isFavorite}
          onToggleFavorite={handleToggleFavorite}
          hours={restaurantHours}
          isOpen={isRestaurantOpen && !isManuallyClosed}
          isManuallyClosed={isManuallyClosed}
        />

        {/* Menu */}
        <div className="space-y-12">
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
              restaurantId={params.id}
            />
          )}
        </div>

        {/* Panier flottant - Fixed en bas à droite */}
        {cart.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50 w-80 sm:w-96 max-w-[calc(100vw-2rem)]">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border dark:border-gray-700 p-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Panier ({cart.reduce((sum, item) => sum + (item.quantity || 1), 0)})</h2>
                <button
                  onClick={() => setShowCartModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                >
                  Voir tout
                </button>
              </div>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {cart.slice(0, 3).map((item, idx) => {
                    const itemPrice = parseFloat(item.prix || item.price || 0);
                    const supplementsPrice = item.supplements && Array.isArray(item.supplements) 
                      ? item.supplements.reduce((sum, sup) => sum + parseFloat(sup.prix || sup.price || 0), 0)
                      : 0;
                    const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
                    const totalItemPrice = itemPrice + supplementsPrice + sizePrice;
                    
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
          </div>
        )}
        {/* Modal panier */}
        {showCartModal && (
          <Modal onClose={() => setShowCartModal(false)}>
            <h2 className="text-xl font-bold mb-4">Récapitulatif de votre commande</h2>
            <div className="space-y-2 mb-4">
              {cart.map((item, idx) => {
                const itemPrice = parseFloat(item.prix || item.price || 0);
                const supplementsPrice = item.supplements && Array.isArray(item.supplements) 
                  ? item.supplements.reduce((sum, sup) => sum + parseFloat(sup.prix || sup.price || 0), 0)
                  : 0;
                const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
                const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * (item.quantity || 1);
                
                return (
                  <div key={item.id || idx} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="font-medium">{item.nom || item.name} x{item.quantity || 1}</span>
                      <span className="font-bold">{totalItemPrice.toFixed(2)}€</span>
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
        <ReviewsSection restaurantId={params.id} userId={user?.id} />
      </div>
    </div>
  );
} 