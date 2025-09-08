'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

export default function OrderTest() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [cart, setCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({
    nom: 'Jean',
    prenom: 'Dupont',
    telephone: '06 12 34 56 78',
    adresse: '15 Rue de la Paix',
    code_postal: '75001',
    ville: 'Paris'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  // Plats de test
  const testMenu = [
    { id: 1, name: 'Pizza Margherita', price: 12.50, category: 'Pizza' },
    { id: 2, name: 'Pizza Pepperoni', price: 14.50, category: 'Pizza' },
    { id: 3, name: 'Burger Classique', price: 9.90, category: 'Burger' },
    { id: 4, name: 'Frites', price: 3.50, category: 'Accompagnement' },
    { id: 5, name: 'Coca-Cola', price: 2.50, category: 'Boisson' },
    { id: 6, name: 'Eau', price: 1.50, category: 'Boisson' }
  ];

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*');

      if (error) throw error;
      setRestaurants(data || []);
    } catch (error) {
      console.error('Erreur récupération restaurants:', error);
    }
  };

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(cartItem => cartItem.id === item.id);
      if (existing) {
        return prev.map(cartItem =>
          cartItem.id === item.id
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const getTotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    return 3.00; // Frais de livraison fixes
  };

  const createOrder = async () => {
    if (cart.length === 0) {
      alert('Votre panier est vide');
      return;
    }

    if (!selectedRestaurant) {
      alert('Veuillez sélectionner un restaurant');
      return;
    }

    setLoading(true);
    try {
      const totalAmount = getTotal();
      const deliveryFee = getDeliveryFee();
      const finalTotal = totalAmount + deliveryFee;

      // Générer un code de sécurité
      const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

      const { data: order, error } = await supabase
        .from('orders')
        .insert([{
          customer_name: `${customerInfo.prenom} ${customerInfo.nom}`,
          customer_phone: customerInfo.telephone,
          restaurant_id: selectedRestaurant.id,
          delivery_address: customerInfo.adresse,
          delivery_city: customerInfo.ville,
          delivery_postal_code: customerInfo.code_postal,
          delivery_instructions: 'Sonner fort, 3ème étage',
          delivery_fee: deliveryFee,
          total_amount: totalAmount,
          items: cart,
          status: 'pending',
          security_code: securityCode
        }])
        .select()
        .single();

      if (error) throw error;

      setSuccess(`Commande créée avec succès ! ID: ${order.id}, Code: ${securityCode}`);
      setCart([]);
      setSelectedRestaurant(null);
    } catch (error) {
      console.error('Erreur création commande:', error);
      alert('Erreur lors de la création de la commande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-center mb-8">🧪 Test de Commande</h1>
          
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800 font-medium">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sélection restaurant */}
            <div>
              <h2 className="text-xl font-semibold mb-4">1. Choisir un restaurant</h2>
              <div className="space-y-2">
                {restaurants.map(restaurant => (
                  <div
                    key={restaurant.id}
                    className={`p-4 border rounded-lg cursor-pointer ${
                      selectedRestaurant?.id === restaurant.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRestaurant(restaurant)}
                  >
                    <h3 className="font-medium">{restaurant.nom}</h3>
                    <p className="text-sm text-gray-600">{restaurant.adresse}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Menu */}
            <div>
              <h2 className="text-xl font-semibold mb-4">2. Choisir des plats</h2>
              <div className="space-y-2">
                {testMenu.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.category}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{item.price}€</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Panier */}
          {cart.length > 0 && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold mb-4">3. Votre panier</h2>
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{item.name}</h4>
                      <p className="text-sm text-gray-600">{item.price}€ × {item.quantity}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        -
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 ml-2"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Sous-total</span>
                  <span>{getTotal().toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Frais de livraison</span>
                  <span>{getDeliveryFee().toFixed(2)}€</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>Total</span>
                  <span>{(getTotal() + getDeliveryFee()).toFixed(2)}€</span>
                </div>
              </div>

              <button
                onClick={createOrder}
                disabled={loading || !selectedRestaurant}
                className="w-full mt-4 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Création...' : 'Créer la commande de test'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
