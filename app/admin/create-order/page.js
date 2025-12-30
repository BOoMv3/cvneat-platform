'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaArrowLeft, FaPlus, FaMinus, FaTrash, FaSpinner, FaTimes } from 'react-icons/fa';

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
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedSupplements, setSelectedSupplements] = useState([]);
  const [selectedMeats, setSelectedMeats] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [quantity, setQuantity] = useState(1);
  
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

  const openModal = (item) => {
    setSelectedItem(item);
    setSelectedSupplements([]);
    setSelectedMeats([]);
    setSelectedSauces([]);
    setQuantity(1);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
    setSelectedSupplements([]);
    setSelectedMeats([]);
    setSelectedSauces([]);
    setQuantity(1);
  };

  const toggleSupplement = (supplement) => {
    setSelectedSupplements(prev => {
      const exists = prev.find(s => s.id === supplement.id);
      if (exists) {
        return prev.filter(s => s.id !== supplement.id);
      } else {
        return [...prev, supplement];
      }
    });
  };

  const toggleMeat = (meat) => {
    const maxMeats = selectedItem?.max_meats;
    setSelectedMeats(prev => {
      const exists = prev.find(m => (m.id || m.nom) === (meat.id || meat.nom));
      if (exists) {
        return prev.filter(m => (m.id || m.nom) !== (meat.id || meat.nom));
      } else {
        if (maxMeats && prev.length >= maxMeats) {
          alert(`Maximum ${maxMeats} viande(s) autorisée(s)`);
          return prev;
        }
        return [...prev, meat];
      }
    });
  };

  const toggleSauce = (sauce) => {
    const maxSauces = selectedItem?.max_sauces;
    if (maxSauces === 0) return; // Sauces déjà comprises
    
    setSelectedSauces(prev => {
      const exists = prev.find(s => (s.id || s.nom) === (sauce.id || sauce.nom));
      if (exists) {
        return prev.filter(s => (s.id || s.nom) !== (sauce.id || sauce.nom));
      } else {
        if (maxSauces && maxSauces > 0 && prev.length >= maxSauces) {
          alert(`Maximum ${maxSauces} sauce(s) autorisée(s)`);
          return prev;
        }
        return [...prev, sauce];
      }
    });
  };

  const calculateItemPrice = () => {
    if (!selectedItem) return 0;
    
    let total = parseFloat(selectedItem.prix || selectedItem.price || 0);
    
    // Ajouter les suppléments
    selectedSupplements.forEach(sup => {
      total += parseFloat(sup.prix || sup.price || 0);
    });
    
    // Ajouter les viandes
    selectedMeats.forEach(meat => {
      total += parseFloat(meat.prix || meat.price || 0);
    });
    
    // Ajouter les sauces
    selectedSauces.forEach(sauce => {
      total += parseFloat(sauce.prix || sauce.price || 0);
    });
    
    return total * quantity;
  };

  const addToCart = () => {
    if (!selectedItem) return;
    
    const itemPrice = calculateItemPrice() / quantity; // Prix unitaire
    
    const cartItem = {
      id: selectedItem.id,
      name: selectedItem.nom || selectedItem.name,
      price: itemPrice,
      quantity: quantity,
      is_formula: selectedItem.is_formula || false,
      supplements: selectedSupplements,
      customizations: {
        selectedMeats: selectedMeats,
        selectedSauces: selectedSauces
      }
    };
    
    setCart([...cart, cartItem]);
    closeModal();
  };

  const removeFromCart = (index) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const updateCartQuantity = (index, qty) => {
    if (qty <= 0) {
      removeFromCart(index);
      return;
    }
    
    const updatedCart = [...cart];
    updatedCart[index].quantity = qty;
    setCart(updatedCart);
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => {
      const basePrice = item.price || 0;
      let itemTotal = basePrice * item.quantity;
      
      // Ajouter les suppléments
      if (item.supplements && Array.isArray(item.supplements)) {
        item.supplements.forEach(sup => {
          itemTotal += (parseFloat(sup.prix || sup.price || 0) * item.quantity);
        });
      }
      
      // Ajouter les viandes
      if (item.customizations?.selectedMeats && Array.isArray(item.customizations.selectedMeats)) {
        item.customizations.selectedMeats.forEach(meat => {
          itemTotal += (parseFloat(meat.prix || meat.price || 0) * item.quantity);
        });
      }
      
      // Ajouter les sauces
      if (item.customizations?.selectedSauces && Array.isArray(item.customizations.selectedSauces)) {
        item.customizations.selectedSauces.forEach(sauce => {
          itemTotal += (parseFloat(sauce.prix || sauce.price || 0) * item.quantity);
        });
      }
      
      return sum + itemTotal;
    }, 0);
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

      // Préparer les items avec toutes les customizations
      const items = cart.map(item => {
        const itemData = {
          id: item.id,
          nom: item.name,
          prix: item.price,
          price: item.price,
          quantity: item.quantity,
          is_formula: item.is_formula
        };
        
        // Ajouter les suppléments
        if (item.supplements && item.supplements.length > 0) {
          itemData.supplements = item.supplements;
        }
        
        // Ajouter les customizations
        if (item.customizations) {
          itemData.customizations = item.customizations;
        }
        
        return itemData;
      });

      const orderData = {
        restaurantId: selectedRestaurant,
        items: items,
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

  // Normaliser les options depuis l'item
  const normalizeOptions = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const itemSupplements = selectedItem ? normalizeOptions(selectedItem.supplements) : [];
  const itemMeatOptions = selectedItem ? normalizeOptions(selectedItem.meat_options) : [];
  const itemSauceOptions = selectedItem ? normalizeOptions(selectedItem.sauce_options) : [];

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
                            onClick={() => openModal(item)}
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
                    <div key={index} className="border-b pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-sm text-gray-600">
                            {item.price.toFixed(2)}€ × {item.quantity}
                            {item.supplements && item.supplements.length > 0 && (
                              <span className="ml-2 text-xs">(+{item.supplements.length} suppl.)</span>
                            )}
                            {item.customizations?.selectedMeats && item.customizations.selectedMeats.length > 0 && (
                              <span className="ml-2 text-xs">(+{item.customizations.selectedMeats.length} viande)</span>
                            )}
                            {item.customizations?.selectedSauces && item.customizations.selectedSauces.length > 0 && (
                              <span className="ml-2 text-xs">(+{item.customizations.selectedSauces.length} sauce)</span>
                            )}
                          </p>
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

      {/* Modal pour sélectionner les options */}
      {showModal && selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
              <h3 className="text-xl font-bold">{selectedItem.nom || selectedItem.name}</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quantité */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantité
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <FaMinus />
                  </button>
                  <span className="text-lg font-semibold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    <FaPlus />
                  </button>
                </div>
              </div>

              {/* Suppléments */}
              {itemSupplements.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Suppléments
                  </label>
                  <div className="space-y-2">
                    {itemSupplements.map(supplement => {
                      const isSelected = selectedSupplements.find(s => s.id === supplement.id);
                      return (
                        <label
                          key={supplement.id}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => toggleSupplement(supplement)}
                              className="w-5 h-5"
                            />
                            <span>{supplement.nom || supplement.name}</span>
                          </div>
                          <span className="font-semibold text-blue-600">
                            +{(supplement.prix || supplement.price || 0).toFixed(2)}€
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options de viande */}
              {itemMeatOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Viandes {selectedItem.max_meats && `(max ${selectedItem.max_meats})`}
                  </label>
                  <div className="space-y-2">
                    {itemMeatOptions.map(meat => {
                      const isSelected = selectedMeats.find(m => (m.id || m.nom) === (meat.id || meat.nom));
                      return (
                        <label
                          key={meat.id || meat.nom}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => toggleMeat(meat)}
                              className="w-5 h-5"
                            />
                            <span>{meat.nom || meat.name}</span>
                          </div>
                          {(meat.prix || meat.price) > 0 && (
                            <span className="font-semibold text-blue-600">
                              +{(meat.prix || meat.price || 0).toFixed(2)}€
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Options de sauce */}
              {itemSauceOptions.length > 0 && selectedItem.max_sauces !== 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sauces {selectedItem.max_sauces && selectedItem.max_sauces > 0 && `(max ${selectedItem.max_sauces})`}
                  </label>
                  <div className="space-y-2">
                    {itemSauceOptions.map(sauce => {
                      const isSelected = selectedSauces.find(s => (s.id || s.nom) === (sauce.id || sauce.nom));
                      return (
                        <label
                          key={sauce.id || sauce.nom}
                          className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={!!isSelected}
                              onChange={() => toggleSauce(sauce)}
                              className="w-5 h-5"
                            />
                            <span>{sauce.nom || sauce.name}</span>
                          </div>
                          {(sauce.prix || sauce.price) > 0 && (
                            <span className="font-semibold text-blue-600">
                              +{(sauce.prix || sauce.price || 0).toFixed(2)}€
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prix total */}
              <div className="border-t pt-4">
                <div className="flex justify-between text-xl font-bold">
                  <span>Total:</span>
                  <span>{calculateItemPrice().toFixed(2)}€</span>
                </div>
              </div>

              {/* Bouton ajouter */}
              <button
                onClick={addToCart}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              >
                Ajouter au panier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
