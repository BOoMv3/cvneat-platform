'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';

export default function Home() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        console.log('Début du chargement des restaurants...');
        const response = await fetch('/api/restaurants');
        console.log('Statut de la réponse:', response.status);
        console.log('Headers de la réponse:', Object.fromEntries(response.headers.entries()));
        
        const data = await response.json();
        console.log('Données reçues:', data);
        console.log('Données reçues de l-API :', JSON.stringify(data, null, 2));
        
        if (!response.ok) {
          console.error('Erreur détaillée:', data);
          throw new Error(data.message || 'Erreur lors du chargement des restaurants');
        }
        
        if (!Array.isArray(data)) {
          console.error('Les données reçues ne sont pas un tableau:', data);
          setRestaurants([]);
          setError('Format de données invalide');
          return;
        }
        
        setRestaurants(data);
      } catch (error) {
        console.error('Erreur complète:', error);
        setError(error.message);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  // Charger le panier depuis localStorage au montage côté client pour éviter les erreurs d'hydratation
  useEffect(() => {
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        if (cartData && Array.isArray(cartData.items)) {
          setCart(cartData.items);
        }
      } catch (e) {
        console.error("Impossible de parser le panier depuis localStorage", e);
        localStorage.removeItem('cart'); // Nettoyer le panier corrompu
      }
    }
  }, []);

  // Ajout d'un effet pour fermer la modale avec Échap
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  // Fonction de fermeture propre de la modale
  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
    setMenu([]);
    setMenuLoading(false);
    setError(null);
  };

  const handleRestaurantClick = async (restaurant) => {
    try {
      setMenuLoading(true);
      setError(null);
      setSelectedRestaurant(restaurant);
      setIsModalOpen(true);
      const [restaurantResponse, menuResponse] = await Promise.all([
        fetch(`/api/restaurants/${restaurant.id}`),
        fetch(`/api/restaurants/${restaurant.id}/menu`)
      ]);
      // Vérification du code HTTP et du type de contenu
      if (!restaurantResponse.ok) {
        const text = await restaurantResponse.text();
        throw new Error(text || 'Erreur lors du chargement du restaurant');
      }
      if (!menuResponse.ok) {
        const text = await menuResponse.text();
        throw new Error(text || 'Erreur lors du chargement du menu');
      }
      const contentType1 = restaurantResponse.headers.get('content-type');
      const contentType2 = menuResponse.headers.get('content-type');
      if (!contentType1?.includes('application/json') || !contentType2?.includes('application/json')) {
        throw new Error('Réponse inattendue du serveur (pas du JSON)');
      }
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
      setSelectedRestaurant(restaurantData);
      setMenu(menuData);
      console.log('menu reçu dans la page :', menuData);
    } catch (error) {
      setError(error.message);
      setMenu([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const addToCart = (item) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newCart = [...prevCart, { ...item, quantity: 1 }];
      }
      
      // Sauvegarder dans localStorage avec les infos du restaurant
      const cartData = {
        items: newCart,
        restaurant: selectedRestaurant
      };
      localStorage.setItem('cart', JSON.stringify(cartData));
      
      return newCart;
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== itemId);
      
      // Sauvegarder dans localStorage
      const cartData = {
        items: newCart,
        restaurant: selectedRestaurant
      };
      localStorage.setItem('cart', JSON.stringify(cartData));
      
      return newCart;
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart => {
      const newCart = prevCart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      
      // Sauvegarder dans localStorage
      const cartData = {
        items: newCart,
        restaurant: selectedRestaurant
      };
      localStorage.setItem('cart', JSON.stringify(cartData));
      
      return newCart;
    });
  };

  const categories = [
    { id: 1, name: 'Français', icon: '🍷' },
    { id: 2, name: 'Italien', icon: '🍕' },
    { id: 3, name: 'Japonais', icon: '🍱' },
    { id: 4, name: 'Indien', icon: '🍛' },
    { id: 5, name: 'Fast-Food', icon: '🍔' },
    { id: 6, name: 'Végétarien', icon: '🥗' },
  ];

  // Tri des restaurants sponsorisés en haut
  const now = new Date();
  const sortedRestaurants = [...restaurants].sort((a, b) => {
    const aSponsor = a.mise_en_avant && a.mise_en_avant_fin && new Date(a.mise_en_avant_fin) > now;
    const bSponsor = b.mise_en_avant && b.mise_en_avant_fin && new Date(b.mise_en_avant_fin) > now;
    if (aSponsor === bSponsor) return 0;
    return aSponsor ? -1 : 1;
  });

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-700 mb-6">Impossible de charger les restaurants pour le moment.</p>
          <p className="text-sm text-gray-500">
            Détail de l'erreur : {error}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-black text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (restaurants.length === 0) {
    return (
      <div className="text-center text-gray-600">
        <p>Aucun restaurant disponible</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative h-[600px]">
        <Image
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
          alt="Bannière de restauration"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-black opacity-60"></div>
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              Découvrez les meilleurs restaurants
            </h1>
            <p className="text-xl md:text-2xl mb-8">
              Livraison rapide et repas délicieux à votre porte
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => router.push('/restaurants')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Commander maintenant
              </button>
              <button 
                onClick={() => router.push('/restaurants')}
                className="bg-white hover:bg-gray-100 text-blue-600 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Voir les restaurants
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Restaurants populaires</h2>
          {cart.length > 0 && (
            <div className="relative">
              <button
                onClick={() => router.push('/panier')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center"
              >
                <span className="mr-2">🛒</span>
                <span>{cart.reduce((total, item) => total + item.quantity, 0)} articles</span>
              </button>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sortedRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              onClick={() => handleRestaurantClick(restaurant)}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer"
            >
              <div className="relative h-48">
                <Image
                  src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'}
                  alt={restaurant.nom}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > now && (
                  <span className="absolute top-2 left-2 bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">Sponsorisé</span>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{restaurant.nom}</h3>
                <p className="text-gray-600 mb-2">{restaurant.description}</p>
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center">
                    <span className="mr-4">⭐ {restaurant.rating || '4.5'}</span>
                    <span>🕒 {restaurant.deliveryTime} min</span>
                  </div>
                  <div className="text-right">
                    <p>Frais de livraison: {restaurant.frais_livraison ? `${restaurant.frais_livraison}€` : 'Gratuit'}</p>
                    <p>Commande min: {restaurant.minOrder}€</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedRestaurant?.nom || 'Chargement...'}</h2>
                  <p className="text-gray-600">{selectedRestaurant?.description}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fermer la modale"
                >
                  ✕
                </button>
              </div>
              {menuLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
                  <p>{error}</p>
                  <button onClick={closeModal} className="mt-4 px-4 py-2 bg-gray-200 rounded">Fermer</button>
                </div>
              ) : selectedRestaurant && Array.isArray(menu) && menu.length > 0 ? (
                <div className="space-y-6">
                  {/* Menu */}
                  <div>
                    <h3 className="text-xl font-semibold mb-4">Menu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.isArray(menu) && menu.map((item) => (
                        <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                          <div>
                            <h5 className="font-medium">{item.name}</h5>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            <p className="text-orange-600 font-medium">{item.price}€</p>
                          </div>
                          <button
                            onClick={() => addToCart(item)}
                            className="bg-orange-500 text-white px-3 py-1 rounded-full hover:bg-orange-600 transition-colors"
                          >
                            + Ajouter
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Panier */}
                  {cart.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-semibold mb-4">Votre panier</h3>
                      <div className="space-y-3">
                        {cart.map((item) => (
                          <div key={item.id} className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-600">{item.price}€ x {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                -
                              </button>
                              <span>{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="text-gray-500 hover:text-gray-700"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-500 hover:text-red-700 ml-2"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className="border-t pt-3">
                          <div className="flex justify-between font-semibold">
                            <span>Total</span>
                            <span>
                              {cart.reduce((total, item) => total + (item.price * item.quantity), 0).toFixed(2)}€
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              router.push('/checkout');
                              closeModal();
                            }}
                            className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg hover:bg-orange-600 transition-colors"
                          >
                            Passer la commande
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500">Aucun menu disponible pour ce restaurant.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 