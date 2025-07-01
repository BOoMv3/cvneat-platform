'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { safeLocalStorage } from '../../../lib/localStorage';
import { FaStar, FaClock, FaMotorcycle, FaPlus, FaMinus, FaShoppingCart, FaMapMarkerAlt } from 'react-icons/fa';
import Modal from '../../components/Modal';

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
  const [deliveryFee, setDeliveryFee] = useState(2.50);
  const [deliveryInfoLoading, setDeliveryInfoLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    checkUser();
    fetchRestaurantDetails();
    loadCartFromStorage();
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
      setError(err.message);
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
            <p className="text-red-600 font-bold">{error}</p>
            <button onClick={() => router.push('/restaurants')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à la liste</button>
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
            <button onClick={() => router.push('/restaurants')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Retour à la liste</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-4 py-8">
        {/* En-tête du restaurant */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3">
              <img
                src={restaurant.image || '/placeholder-restaurant.jpg'}
                alt={restaurant.nom}
                className="w-full h-64 object-cover rounded-lg"
              />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-4">{restaurant.nom}</h1>
              <p className="text-gray-600 mb-4">{restaurant.description}</p>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center">
                  <FaStar className="text-yellow-400 mr-1" />
                  <span className="font-medium">{restaurant.rating}</span>
                  <span className="text-gray-500 ml-1">({restaurant.reviewCount} avis)</span>
                </div>
                <div className="flex items-center">
                  <FaClock className="text-gray-500 mr-1" />
                  <span>{restaurant.deliveryTime} min</span>
                </div>
                <div className="flex items-center">
                  <FaMotorcycle className="text-gray-500 mr-1" />
                  <span>
                    {deliveryInfoLoading ? 'Calcul...' : deliveryFee !== null ? `${deliveryFee.toFixed(2)}€ de livraison` : 'Livraison non disponible'}
                  </span>
                </div>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center"><FaMapMarkerAlt className="mr-2" />Adresse de livraison :</label>
                <input
                  type="text"
                  className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Votre adresse complète"
                  value={deliveryAddress}
                  onChange={e => setDeliveryAddress(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">Le prix de livraison s'adapte automatiquement à votre adresse.</p>
              </div>
              <div className="text-sm text-gray-500">
                <p>{restaurant.adresse}</p>
                <p>{restaurant.ville}, {restaurant.code_postal}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="space-y-12">
          {menu.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Aucun plat disponible pour ce restaurant.</p>
            </div>
          ) : (
            [...new Set(menu.map(item => item.category))].filter(Boolean).map(category => {
              const categoryItems = menu.filter(item => item.category === category);
              return (
                <div key={category}>
                  <h3 className="text-3xl font-bold mb-8 text-gray-900 border-b border-gray-200 pb-2 uppercase tracking-wide">{category}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {categoryItems.map((item) => (
                      <div key={item.id} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col justify-between hover:shadow-2xl transition-shadow">
                        <div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">{item.nom}</h4>
                          <p className="text-gray-600 text-base mb-4">{item.description}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-2xl font-bold text-blue-600">
                            {typeof item.prix === 'number' ? item.prix.toFixed(2) + '€' : (item.prix ? Number(item.prix).toFixed(2) + '€' : 'Prix manquant')}
                          </span>
                          <button
                            onClick={() => addToCart(item)}
                            className="ml-4 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 transition-colors shadow"
                          >
                            <FaPlus className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Panier */}
        <div className="w-96">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-8">
            <h2 className="text-xl font-bold mb-4">Votre commande</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Votre panier est vide</p>
            ) : (
              <>
                <div className="space-y-4 mb-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{item.nom || item.name}</p>
                        <p className="text-sm text-gray-500">{(item.prix || item.price || 0).toFixed(2)}€</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        >
                          <FaMinus className="text-xs" />
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-6 h-6 rounded-full border flex items-center justify-center hover:bg-gray-100"
                        >
                          <FaPlus className="text-xs" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <p>Sous-total</p>
                    <p>{getSubtotal().toFixed(2)}€</p>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <p>Frais de livraison</p>
                    <p>{deliveryFee !== null ? deliveryFee.toFixed(2) : 'Calcul en cours'}€</p>
                  </div>
                  <div className="flex justify-between items-center font-bold text-lg mb-4">
                    <p>Total</p>
                    <p>{getTotal().toFixed(2)}€</p>
                  </div>
                  <button
                    onClick={handleCheckout}
                    className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800 flex items-center justify-center gap-2"
                  >
                    <FaShoppingCart />
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
            <div className="flex justify-between mb-2"><span>Frais de livraison</span><span>{deliveryFee !== null ? deliveryFee.toFixed(2) : 'Calcul en cours'}€</span></div>
            <div className="flex justify-between font-bold text-lg mb-4"><span>Total</span><span>{getTotal().toFixed(2)}€</span></div>
            <button onClick={() => router.push('/checkout')} className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">Valider et payer</button>
          </Modal>
        )}
      </main>
    </div>
  );
} 