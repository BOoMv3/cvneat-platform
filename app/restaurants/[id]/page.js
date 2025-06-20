'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaStar, FaClock, FaMotorcycle, FaPlus, FaMinus, FaShoppingCart } from 'react-icons/fa';
import Modal from '../../components/Modal';

export default function RestaurantDetail({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCartModal, setShowCartModal] = useState(false);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [params.id]);

  const fetchRestaurantDetails = async () => {
    try {
      const [restaurantResponse, menuResponse] = await Promise.all([
        fetch(`/api/restaurants/${params.id}`),
        fetch(`/api/restaurants/${params.id}/menu`)
      ]);
      if (!restaurantResponse.ok) {
        const text = await restaurantResponse.text();
        throw new Error(text || 'Erreur lors de la récupération des détails du restaurant');
      }
      if (!menuResponse.ok) {
        const text = await menuResponse.text();
        throw new Error(text || 'Erreur lors de la récupération du menu');
      }
      const contentType1 = restaurantResponse.headers.get('content-type');
      const contentType2 = menuResponse.headers.get('content-type');
      if (!contentType1?.includes('application/json') || !contentType2?.includes('application/json')) {
        throw new Error('Réponse inattendue du serveur (pas du JSON)');
      }
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
      
      console.log('Menu data reçu:', menuData);
      console.log('Premier item du menu:', menuData[0]);
      
      // L'API retourne déjà les données avec les bons noms de champs
      // Pas besoin de mapping supplémentaire
      const mappedMenu = Array.isArray(menuData) ? menuData : [];
      
      setRestaurant(restaurantData);
      setMenu(mappedMenu);
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

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + ((item.price || 0) * (item.quantity || 0)), 0);
  };

  const handleCheckout = () => {
    if (!localStorage.getItem('token')) {
      router.push('/login?redirect=' + encodeURIComponent(`/restaurants/${params.id}`));
      return;
    }
    setShowCartModal(true);
  };

  const filteredMenu = menu.filter(item => 
    selectedCategory === 'all' || item.category === selectedCategory
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
                  <span>{restaurant.deliveryFee}€ de livraison</span>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                <p>{restaurant.adresse}</p>
                <p>{restaurant.ville}, {restaurant.code_postal}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Menu */}
        <div className="flex gap-8">
          <div className="flex-1">
            {/* Catégories */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-black text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                Tout
              </button>
              {[...new Set(menu.map(item => item.category))].map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap ${
                    selectedCategory === category
                      ? 'bg-black text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Liste des plats */}
            {filteredMenu.length === 0 ? (
              <div className="text-center text-gray-500">Aucun plat disponible dans cette catégorie.</div>
            ) : (
              filteredMenu.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold mb-2">{item.name}</h3>
                      <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{(item.price || 0).toFixed(2)}€</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex items-center justify-center w-8 h-8 rounded-full bg-black text-white hover:bg-gray-800"
                        >
                          <FaPlus />
                        </button>
                      </div>
                    </div>
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-24 h-24 object-cover rounded-lg ml-4"
                      />
                    )}
                  </div>
                </div>
              ))
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
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-500">{item.price?.toFixed(2) ?? '0.00'}€</p>
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
                      <p>{getCartTotal().toFixed(2)}€</p>
                    </div>
                    <div className="flex justify-between items-center mb-4">
                      <p>Frais de livraison</p>
                      <p>{(restaurant.deliveryFee ?? 0).toFixed(2)}€</p>
                    </div>
                    <div className="flex justify-between items-center font-bold text-lg mb-4">
                      <p>Total</p>
                      <p>{(getCartTotal() + (restaurant.deliveryFee ?? 0)).toFixed(2)}€</p>
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
        </div>
        {/* Modal panier */}
        {showCartModal && (
          <Modal onClose={() => setShowCartModal(false)}>
            <h2 className="text-xl font-bold mb-4">Récapitulatif de votre commande</h2>
            <div className="space-y-2 mb-4">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between">
                  <span>{item.name} x{item.quantity}</span>
                  <span>{((item.price || 0) * (item.quantity || 0)).toFixed(2)}€</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mb-2"><span>Sous-total</span><span>{getCartTotal().toFixed(2)}€</span></div>
            <div className="flex justify-between mb-2"><span>Frais de livraison</span><span>{(restaurant.deliveryFee || 0).toFixed(2)}€</span></div>
            <div className="flex justify-between font-bold text-lg mb-4"><span>Total</span><span>{(getCartTotal() + (restaurant.deliveryFee || 0)).toFixed(2)}€</span></div>
            <button onClick={() => router.push('/checkout')} className="w-full bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600">Valider et payer</button>
          </Modal>
        )}
      </main>
    </div>
  );
} 