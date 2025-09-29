'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/localStorage';
import { 
  FaMapMarkerAlt, 
  FaPlus, 
  FaTimes, 
  FaCreditCard, 
  FaUser, 
  FaPhone, 
  FaEnvelope,
  FaShoppingCart,
  FaMotorcycle,
  FaCheck
} from 'react-icons/fa';

export default function Checkout() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [fraisLivraison, setFraisLivraison] = useState(2.50);
  const [totalAvecLivraison, setTotalAvecLivraison] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    postal_code: '',
    is_default: false
  });
  const [orderDetails, setOrderDetails] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    instructions: ''
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      
      // Charger les données utilisateur
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (userData) {
        setOrderDetails({
          nom: userData.nom || '',
          prenom: userData.prenom || '',
          telephone: userData.telephone || '',
          email: user.email || '',
          instructions: ''
        });
      }

      // Charger les adresses
      const { data: addresses } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false });

      if (addresses && addresses.length > 0) {
        setUserAddresses(addresses);
        setSelectedAddress(addresses.find(addr => addr.is_default) || addresses[0]);
      } else {
        setShowAddressForm(true);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    // Charger le panier
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart && Array.isArray(savedCart.items)) {
      setCart(savedCart.items);
      setFraisLivraison(savedCart.frais_livraison || 2.50);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Calculer les totaux
    const total = cart.reduce((sum, item) => {
      const price = typeof item.prix === 'number' ? item.prix : Number(item.prix);
      return sum + (price * item.quantity);
    }, 0);
    console.log('Recalcul total - cart total:', total, 'frais livraison:', fraisLivraison, 'total avec livraison:', total + fraisLivraison, 'forceUpdate:', forceUpdate);
    setCartTotal(total);
    setTotalAvecLivraison(total + fraisLivraison);
  }, [cart, fraisLivraison, forceUpdate]);

  // Recalcul automatique des frais de livraison à chaque changement d'adresse ou de panier
  useEffect(() => {
    console.log('useEffect déclenché - selectedAddress:', selectedAddress, 'cart.length:', cart.length);
    if (selectedAddress && cart.length > 0) {
      console.log('Appel calculateDeliveryFee depuis useEffect');
      calculateDeliveryFee(selectedAddress);
    }
  }, [selectedAddress, cart]);

  const addNewAddress = async () => {
    if (!newAddress.address || !newAddress.city || !newAddress.postal_code) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      // Si on définit cette adresse comme défaut, on retire le statut défaut des autres
      if (newAddress.is_default) {
        await supabase
          .from('user_addresses')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .insert({
          user_id: user.id,
          name: `${newAddress.city} - ${newAddress.address}`, // Nom automatique
          address: newAddress.address,
          city: newAddress.city,
          postal_code: newAddress.postal_code,
          is_default: newAddress.is_default
        })
        .select()
        .single();

      if (error) {
        console.error('Erreur détaillée:', error);
        throw error;
      }

      setUserAddresses(prev => [...prev, data]);
      setSelectedAddress(data);
      setShowAddressForm(false);
      setNewAddress({ address: '', city: '', postal_code: '', is_default: false });

      // Recalculer les frais de livraison
      await calculateDeliveryFee(data);
      
      // Notification de succès
      alert('Adresse ajoutée avec succès !');
    } catch (error) {
      console.error('Erreur ajout adresse:', error);
      // Affichage détaillé de l'erreur Supabase
      alert('Erreur lors de l\'ajout de l\'adresse : ' + (error.message || JSON.stringify(error)));
    }
  };

  const calculateDeliveryFee = async (address) => {
    if (!cart.length || !address) {
      console.log('Pas de calcul - cart:', cart.length, 'address:', address);
      return;
    }

    console.log('=== CALCUL FRAIS SIMPLE ===');
    console.log('Adresse sélectionnée:', address);

    // Calcul simple basé sur le code postal
    const postalCode = address.postal_code;
    let newFrais = 2.50; // Base

    // Frais selon code postal
    if (postalCode === '34190') { // Ganges
      newFrais = 2.50;
    } else if (postalCode.startsWith('34')) { // Hérault
      newFrais = 3.50;
    } else if (postalCode.startsWith('66')) { // Pyrénées-Orientales
      newFrais = 8.00;
    } else if (postalCode.startsWith('30')) { // Gard
      newFrais = 6.00;
    } else {
      newFrais = 10.00; // Maximum
    }

    console.log('Nouveau frais calculé:', newFrais, 'pour code postal:', postalCode);

    // Mettre à jour immédiatement
    setFraisLivraison(newFrais);
    
    // Forcer le recalcul du total
    const newTotal = cartTotal + newFrais;
    setTotalAvecLivraison(newTotal);
    
    // Forcer le re-render
    setForceUpdate(prev => prev + 1);
    
    console.log('Frais mis à jour:', newFrais, 'Total:', newTotal, 'Force update:', forceUpdate + 1);
    console.log('=== FIN CALCUL FRAIS SIMPLE ===');
  };

  const handleAddressSelect = async (address) => {
    setSelectedAddress(address);
    await calculateDeliveryFee(address);
  };

  const submitOrder = async () => {
    if (!selectedAddress) {
      alert('Veuillez sélectionner une adresse de livraison');
      return;
    }

    if (!orderDetails.nom || !orderDetails.prenom || !orderDetails.telephone) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSubmitting(true);

    try {
      const savedCart = safeLocalStorage.getJSON('cart');
      const restaurant = savedCart?.restaurant;

      if (!restaurant) {
        alert('Erreur: Restaurant non trouvé');
        return;
      }

      // Créer la commande
      const { data: order, error: orderError } = await supabase
        .from('commandes')
        .insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          total: totalAvecLivraison,
          frais_livraison: fraisLivraison,
          adresse_livraison: `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}`,
          statut: 'en_attente'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Ajouter les détails de commande
      console.log('Commande créée avec succès:', order.id);
      console.log('Ajout des détails pour les articles:', cart);
      
      for (const item of cart) {
        const { data: detailData, error: detailError } = await supabase
          .from('details_commande')
          .insert({
            commande_id: order.id,
            plat_id: item.id,
            quantite: item.quantity,
            prix_unitaire: item.prix || item.price
          })
          .select();

        if (detailError) {
          console.error('Erreur ajout détail commande:', detailError);
        } else {
          console.log('Détail ajouté avec succès:', detailData);
        }
      }

      // Vider le panier
      safeLocalStorage.removeItem('cart');
      setCart([]);

      // Rediriger vers la confirmation
      router.push(`/orders/${order.id}`);
    } catch (error) {
      console.error('Erreur création commande:', error);
      alert('Erreur lors de la création de la commande');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <FaShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Panier vide</h1>
          <p className="text-gray-600 mb-4">Votre panier est vide. Ajoutez des articles pour continuer.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Finaliser votre commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informations de livraison */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center">
              <FaMapMarkerAlt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
              Adresse de livraison
            </h2>

            {/* Adresses existantes */}
            {userAddresses.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="font-medium text-gray-900 mb-3 text-sm sm:text-base">Adresses enregistrées</h3>
                <div className="space-y-2 sm:space-y-3">
                  {userAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleAddressSelect(address)}
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors min-h-[44px] touch-manipulation ${
                        selectedAddress?.id === address.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 text-sm sm:text-base">{address.address}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{address.postal_code} {address.city}</p>
                        </div>
                        {selectedAddress?.id === address.id && (
                          <FaCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formulaire nouvelle adresse */}
            {showAddressForm && (
              <div className="border-t pt-4 sm:pt-6">
                <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 text-sm sm:text-base">Nouvelle adresse</h3>
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <input
                      type="text"
                      placeholder="Ville"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                    />
                    <input
                      type="text"
                      placeholder="Code postal"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                    />
                  </div>
                  <label className="flex items-center min-h-[44px] touch-manipulation">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-xs sm:text-sm text-gray-600">Définir comme adresse par défaut</span>
                  </label>
                  <button
                    onClick={addNewAddress}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base"
                  >
                    Ajouter l'adresse
                  </button>
                </div>
              </div>
            )}

            {!showAddressForm && (
              <button
                onClick={() => setShowAddressForm(true)}
                className="flex items-center text-blue-600 hover:text-blue-700 min-h-[44px] touch-manipulation text-sm sm:text-base"
              >
                <FaPlus className="h-4 w-4 mr-2" />
                Ajouter une nouvelle adresse
              </button>
            )}

            {/* Informations de contact */}
            <div className="border-t pt-4 sm:pt-6 mt-4 sm:mt-6">
              <h3 className="font-medium text-gray-900 mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                <FaUser className="h-4 w-4 text-blue-600 mr-2" />
                Informations de contact
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    value={orderDetails.prenom}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, prenom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={orderDetails.nom}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, nom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Téléphone *"
                  value={orderDetails.telephone}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={orderDetails.email}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                />
                <textarea
                  placeholder="Instructions spéciales (optionnel)"
                  value={orderDetails.instructions}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px] touch-manipulation"
                />
              </div>
            </div>
          </div>

          {/* Résumé de la commande */}
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 h-fit">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center">
              <FaShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 mr-2" />
              Résumé de la commande
            </h2>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm sm:text-base truncate">{item.nom}</p>
                    <p className="text-xs sm:text-sm text-gray-600">Quantité: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900 text-sm sm:text-base ml-2">
                    {((typeof item.prix === 'number' ? item.prix : Number(item.prix)) * item.quantity).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                <span>Sous-total</span>
                <span className="font-semibold">{cartTotal.toFixed(2)}€</span>
              </div>
              <div key={`frais-${forceUpdate}`} className="flex justify-between text-gray-600 text-sm sm:text-base">
                <span className="flex items-center">
                  <FaMotorcycle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Frais de livraison
                </span>
                <span className="font-semibold">{fraisLivraison.toFixed(2)}€</span>
              </div>
              {/* Debug affichage */}
              <div key={`debug-${forceUpdate}`} className="text-xs text-gray-400">
                Debug: fraisLivraison={fraisLivraison}, forceUpdate={forceUpdate}
              </div>
              <div key={`total-${forceUpdate}`} className="border-t pt-2 sm:pt-3">
                <div className="flex justify-between text-base sm:text-lg font-bold text-blue-600">
                  <span>Total</span>
                  <span>{totalAvecLivraison.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting || !selectedAddress}
              className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 min-h-[44px] touch-manipulation"
            >
              {submitting ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                  Traitement en cours...
                </div>
              ) : (
                `Confirmer la commande (${totalAvecLivraison.toFixed(2)}€)`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 