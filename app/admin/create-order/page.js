'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaPlus, FaTrash, FaSpinner } from 'react-icons/fa';

export default function AdminCreateOrder() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedRestaurantData, setSelectedRestaurantData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [deliveryInfo, setDeliveryInfo] = useState({
    address: '',
    city: '',
    postalCode: '',
    instructions: ''
  });
  
  const [customerInfo, setCustomerInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  useEffect(() => {
    checkAuth();
    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      fetchRestaurantData(selectedRestaurant);
      fetchMenu(selectedRestaurant);
    } else {
      setMenuItems([]);
      setSelectedRestaurantData(null);
    }
  }, [selectedRestaurant]);

  const fetchRestaurantData = async (restaurantId) => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', restaurantId)
        .single();

      if (error) throw error;
      setSelectedRestaurantData(data);
    } catch (err) {
      console.error('Erreur récupération restaurant:', err);
    }
  };

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!userData || userData.role !== 'admin') {
        router.push('/admin');
        return;
      }

      setLoading(false);
    } catch (err) {
      console.error('Erreur authentification:', err);
      router.push('/login');
    }
  };

  const fetchRestaurants = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('id, nom')
        .order('nom');

      if (error) throw error;
      setRestaurants(data || []);
    } catch (err) {
      console.error('Erreur récupération restaurants:', err);
      setError('Erreur lors de la récupération des restaurants');
    }
  };

  const fetchMenu = async (restaurantId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
      if (!response.ok) throw new Error('Erreur récupération menu');
      
      const data = await response.json();
      setMenuItems(data || []);
    } catch (err) {
      console.error('Erreur récupération menu:', err);
      setError('Erreur lors de la récupération du menu');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const cartItem = {
      id: item.id,
      name: item.nom || item.name,
      price: item.prix || item.price || 0,
      quantity: 1,
      is_formula: item.is_formula || false
    };
    
    setCart([...cart, cartItem]);
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }
    
    const updatedCart = [...cart];
    updatedCart[index].quantity = quantity;
    setCart(updatedCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const deliveryFee = selectedRestaurantData?.frais_livraison || 0;
    return subtotal + deliveryFee;
  };

  const handleCreateOrder = async () => {
    if (!selectedRestaurant) {
      setError('Veuillez sélectionner un restaurant');
      return;
    }

    if (cart.length === 0) {
      setError('Veuillez ajouter au moins un article');
      return;
    }

    if (!deliveryInfo.address || !deliveryInfo.city || !deliveryInfo.postalCode) {
      setError('Veuillez remplir l\'adresse de livraison');
      return;
    }

    if (!customerInfo.firstName || !customerInfo.lastName || !customerInfo.phone) {
      setError('Veuillez remplir les informations client (nom, prénom, téléphone)');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expirée');
      }

      const orderData = {
        restaurantId: selectedRestaurant.id,
        items: cart.map(item => ({
          id: item.id,
          nom: item.name,
          prix: item.price,
          price: item.price,
          quantity: item.quantity,
          is_formula: item.is_formula
        })),
        deliveryInfo: {
          address: deliveryInfo.address,
          city: deliveryInfo.city,
          postalCode: deliveryInfo.postalCode,
          instructions: deliveryInfo.instructions || ''
        },
        customerInfo: {
          firstName: customerInfo.firstName,
          lastName: customerInfo.lastName,
          phone: customerInfo.phone,
          email: customerInfo.email || ''
        },
        deliveryFee: selectedRestaurantData?.frais_livraison || 0,
        totalAmount: calculateSubtotal()
      };

      const response = await fetch('/api/admin/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(orderData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la création de la commande');
      }

      setSuccess(`Commande créée avec succès ! ID: #${result.order.id.slice(0, 8)}`);
      setCart([]);
      setDeliveryInfo({ address: '', city: '', postalCode: '', instructions: '' });
      setCustomerInfo({ firstName: '', lastName: '', phone: '', email: '' });
      
      setTimeout(() => {
        router.push(`/admin/orders/${result.order.id}`);
      }, 2000);
    } catch (err) {
      console.error('Erreur création commande:', err);
      setError(err.message || 'Erreur lors de la création de la commande');
    } finally {
      setCreating(false);
    }
  };

  if (loading && !selectedRestaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <FaSpinner className="animate-spin h-12 w-12 text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/admin')}
            className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
          >
            <FaArrowLeft className="mr-2" />
            Retour au dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Créer une commande admin</h1>
          <p className="text-gray-600 mt-2">Créez une commande comme si un client avait commandé (sans paiement réel)</p>
        </div>

        {/* Messages d'erreur/succès */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne gauche - Sélection restaurant et menu */}
          <div className="lg:col-span-2 space-y-6">
            {/* Sélection restaurant */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">1. Sélectionner un restaurant</h2>
              <select
                value={selectedRestaurant || ''}
                onChange={(e) => setSelectedRestaurant(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">-- Choisir un restaurant --</option>
                {restaurants.map(restaurant => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.nom}
                  </option>
                ))}
              </select>
            </div>

            {/* Menu */}
            {selectedRestaurant && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">2. Menu du restaurant</h2>
                {menuItems.length === 0 ? (
                  <p className="text-gray-500">Aucun article disponible</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {menuItems.map(item => (
                      <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                        <h3 className="font-semibold">{item.nom || item.name}</h3>
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-600">{item.prix || item.price}€</span>
                          <button
                            onClick={() => addToCart(item)}
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            <FaPlus className="inline mr-1" />
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Panier */}
            {cart.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">Panier</h2>
                <div className="space-y-3">
                  {cart.map((item, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-3">
                      <div className="flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-gray-600">{item.price}€ × {item.quantity}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateCartQuantity(index, parseInt(e.target.value))}
                          className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                        />
                        <button
                          onClick={() => removeFromCart(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Sous-total:</span>
                    <span>{calculateSubtotal().toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Frais de livraison:</span>
                    <span>{(selectedRestaurantData?.frais_livraison || 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold mt-2 pt-2 border-t">
                    <span>Total:</span>
                    <span>{calculateTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Colonne droite - Informations client et livraison */}
          <div className="space-y-6">
            {/* Informations client */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">3. Informations client</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prénom *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.firstName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom *
                  </label>
                  <input
                    type="text"
                    value={customerInfo.lastName}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Téléphone *
                  </label>
                  <input
                    type="tel"
                    value={customerInfo.phone}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email (optionnel)
                  </label>
                  <input
                    type="email"
                    value={customerInfo.email}
                    onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Adresse de livraison */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">4. Adresse de livraison</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse *
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.address}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.city}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, city: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Code postal *
                  </label>
                  <input
                    type="text"
                    value={deliveryInfo.postalCode}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, postalCode: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Instructions (optionnel)
                  </label>
                  <textarea
                    value={deliveryInfo.instructions}
                    onChange={(e) => setDeliveryInfo({ ...deliveryInfo, instructions: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows="3"
                  />
                </div>
              </div>
            </div>

            {/* Bouton créer */}
            <button
              onClick={handleCreateOrder}
              disabled={creating || cart.length === 0 || !selectedRestaurant}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-lg flex items-center justify-center"
            >
              {creating ? (
                <>
                  <FaSpinner className="animate-spin mr-2" />
                  Création en cours...
                </>
              ) : (
                'Créer la commande'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

