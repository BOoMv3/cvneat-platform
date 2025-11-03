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
    
    console.log('Favoris mis à jour:', newFavorites);
    console.log('Restaurant actuel est favori:', newIsFavorite);
    console.log('ID du restaurant:', params.id);
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
      const [restaurantResponse, menuResponse] = await Promise.all([
        fetch(`/api/restaurants/${params.id}`),
        fetch(`/api/restaurants/${params.id}/menu`)
      ]);
      if (!restaurantResponse.ok) throw new Error('Erreur de chargement du restaurant');
      if (!menuResponse.ok) throw new Error('Erreur de chargement du menu');
      
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
      
      console.log('Données du restaurant:', restaurantData);
      console.log('Données du menu:', menuData);
      console.log('Premier plat du menu:', menuData[0]);
      console.log('Champs disponibles dans le premier plat:', menuData[0] ? Object.keys(menuData[0]) : 'Aucun plat');
      
      setRestaurant(restaurantData);
      setMenu(Array.isArray(menuData) ? menuData : []);
    } catch (err) {
      console.error('Erreur lors du chargement du restaurant:', err);
      setError(`Erreur lors du chargement: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        return prevCart.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prevCart, { ...item, quantity: 1 }];
    });
    setLastAddedItem(item);
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 3000);
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(cartItem => cartItem.id === itemId);
      if (existingItem.quantity === 1) {
        return prevCart.filter(cartItem => cartItem.id !== itemId);
      }
      return prevCart.map(cartItem =>
        cartItem.id === itemId
          ? { ...cartItem, quantity: cartItem.quantity - 1 }
          : cartItem
      );
    });
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + ((item.prix || item.price || 0) * (item.quantity || 0)), 0);
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
    // La sauvegarde se fait via le useEffect, on peut directement aller au checkout
    router.push('/checkout');
  };

  const filteredMenu = menu.filter(item => 
    selectedCategory === 'all' || (item.category || item.categorie || 'Autres') === selectedCategory
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
            <p className="text-gray-600 mb-2">Erreur: {error}</p>
            <p className="text-sm text-gray-500 mb-6">ID du restaurant: {params.id}</p>
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-red-600 font-bold">Restaurant non trouvé ou erreur de chargement.</p>
            <button onClick={() => router.push('/')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à l'accueil</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header avec bouton de retour */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <button 
            onClick={() => router.push('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors"
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
        />

        {/* Section adresse de livraison - Optimisée mobile */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center">
              <FaMapMarkerAlt className="mr-2 h-4 w-4" />
              Adresse de livraison :
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-3 sm:py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base min-h-[48px] touch-manipulation"
              placeholder="Votre adresse complète"
              value={deliveryAddress}
              onChange={e => setDeliveryAddress(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-2">
              Le prix de livraison s'adapte automatiquement à votre adresse.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            <p>{restaurant.adresse}</p>
            <p>{restaurant.ville}, {restaurant.code_postal}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-12">
          {menu.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
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

        {/* Panier - Optimisé mobile */}
        <div className="w-full lg:w-96">
          <div className="bg-white rounded-lg shadow-sm p-4 lg:p-6 sticky top-8">
            <h2 className="text-lg lg:text-xl font-bold mb-4">Votre commande</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Votre panier est vide</p>
            ) : (
              <>
                <div className="space-y-3 sm:space-y-4 mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <p className="font-medium text-sm sm:text-base">{item.nom || item.name}</p>
                        <p className="text-xs sm:text-sm text-gray-500">{(item.prix || item.price || 0).toFixed(2)}€</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-8 h-8 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center hover:bg-gray-100 touch-manipulation active:scale-95"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span className="text-sm sm:text-base font-medium min-w-[20px] text-center">{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-8 h-8 sm:w-6 sm:h-6 rounded-full border flex items-center justify-center hover:bg-gray-100 touch-manipulation active:scale-95"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2 text-sm sm:text-base">
                    <p>Sous-total</p>
                    <p>{getSubtotal().toFixed(2)}€</p>
                  </div>
                  <div className="flex justify-between items-center mb-4 text-sm sm:text-base">
                    <p>Frais de livraison</p>
                    <p>{deliveryFee !== null ? `${deliveryFee.toFixed(2)}€` : 'À calculer après sélection de l\'adresse'}</p>
                  </div>
                  <div className="flex justify-between items-center font-bold text-base sm:text-lg mb-4">
                    <p>Total</p>
                    <p>{deliveryFee !== null ? getTotal().toFixed(2) : getSubtotal().toFixed(2)}€</p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-black text-white py-4 sm:py-3 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2 font-semibold text-base sm:text-base min-h-[52px] touch-manipulation active:scale-95"
                  >
                    <FaShoppingCart className="h-4 w-4" />
                    Commander
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Modal panier */}
        {showCartModal && (
          <Modal onClose={() => setShowCartModal(false)}>
            <h2 className="text-xl font-bold mb-4">Récapitulatif de votre commande</h2>
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.nom || item.name} x{item.quantity}</span>
                  <span>{((item.prix || item.price || 0) * (item.quantity || 0)).toFixed(2)}€</span>
                </div>
              ))}
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