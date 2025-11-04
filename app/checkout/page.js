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
  const [deliveryError, setDeliveryError] = useState(null);
  const [addressValidationMessage, setAddressValidationMessage] = useState(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
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
    // Calculer les totaux en incluant suppléments et tailles
    const total = cart.reduce((sum, item) => {
      const itemPrice = parseFloat(item.prix || item.price || 0);
      const itemQuantity = parseInt(item.quantity || 1, 10);

      // Calculer le prix des suppléments
      let supplementsPrice = 0;
      if (item.supplements && Array.isArray(item.supplements)) {
        supplementsPrice = item.supplements.reduce((supSum, sup) => {
          return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
        }, 0);
      }

      // Calculer le prix de la taille
      let sizePrice = 0;
      if (item.size && item.size.prix) {
        sizePrice = parseFloat(item.size.prix) || 0;
      } else if (item.prix_taille) {
        sizePrice = parseFloat(item.prix_taille) || 0;
      }

      // Total pour cet item = (prix de base + suppléments + taille) * quantité
      const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * itemQuantity;
      return sum + totalItemPrice;
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
      return;
    }

    console.log('🚚 === CALCUL LIVRAISON 5.0 ===');
    console.log('Adresse:', address);

    // Construire l'adresse complète
    const fullAddress = `${address.address}, ${address.postal_code} ${address.city}, France`;
    console.log('Adresse complète:', fullAddress);

    try {
      console.log('📡 Appel API /api/delivery/calculate...');
      
      const response = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: fullAddress })
      });

      console.log('📡 Réponse HTTP:', response.status, response.statusText);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status} ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('📡 Réponse brute:', responseText);

      if (!responseText || responseText.trim() === '') {
        throw new Error('Réponse vide du serveur');
      }

      const data = JSON.parse(responseText);
      console.log('📡 Données parsées:', data);

      // VALIDATION STRICTE: Vérifier que la livraison est possible
      // Vérifier explicitement que success est true ET livrable est true
      if (data.success !== true || data.livrable !== true) {
        const message = data.message || 'Livraison non disponible à cette adresse';
        console.error('❌ Livraison refusée - success:', data.success, 'livrable:', data.livrable, 'message:', message);
        console.error('❌ Données complètes:', data);
        
        // Afficher le message d'erreur dans un pop-up
        setDeliveryError(message);
        setAddressValidationMessage(message);
        setShowErrorModal(true);
        
        // Réinitialiser les frais de livraison
        setFraisLivraison(0);
        const cartTotalCalc = cart.reduce((sum, item) => {
          const itemPrice = parseFloat(item.prix || item.price || 0);
          const itemQuantity = parseInt(item.quantity || 1, 10);
          let supplementsPrice = 0;
          if (item.supplements && Array.isArray(item.supplements)) {
            supplementsPrice = item.supplements.reduce((supSum, sup) => {
              return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
            }, 0);
          }
          let sizePrice = 0;
          if (item.size && item.size.prix) {
            sizePrice = parseFloat(item.size.prix) || 0;
          } else if (item.prix_taille) {
            sizePrice = parseFloat(item.prix_taille) || 0;
          }
          const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * itemQuantity;
          return sum + totalItemPrice;
        }, 0);
        setTotalAvecLivraison(cartTotalCalc);
        return;
      }

      // SUCCÈS - Réinitialiser les erreurs
      setDeliveryError(null);
      setAddressValidationMessage(null);
      setShowErrorModal(false);

      // SUCCÈS - Mettre à jour les frais
      const newFrais = data.frais_livraison;
      setFraisLivraison(newFrais);
      
      // Recalculer le total du panier avec suppléments et tailles
      const currentCartTotal = cart.reduce((sum, item) => {
        const itemPrice = parseFloat(item.prix || item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1, 10);

        let supplementsPrice = 0;
        if (item.supplements && Array.isArray(item.supplements)) {
          supplementsPrice = item.supplements.reduce((supSum, sup) => {
            return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
          }, 0);
        }

        let sizePrice = 0;
        if (item.size && item.size.prix) {
          sizePrice = parseFloat(item.size.prix) || 0;
        } else if (item.prix_taille) {
          sizePrice = parseFloat(item.prix_taille) || 0;
        }

        const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * itemQuantity;
        return sum + totalItemPrice;
      }, 0);
      
      setTotalAvecLivraison(currentCartTotal + newFrais);
      setForceUpdate(prev => prev + 1);

    } catch (error) {
      if (error instanceof SyntaxError) {
        alert('Erreur de communication avec le serveur. Réessayez.');
      } else {
        alert(`Erreur: ${error.message || 'Impossible de calculer les frais de livraison'}`);
      }
    }
  };

  const handleAddressSelect = async (address) => {
    setSelectedAddress(address);
    setDeliveryError(null);
    setAddressValidationMessage(null);
    setShowErrorModal(false);
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
        setSubmitting(false);
        return;
      }

      // Vérifier si le restaurant est ouvert
      const hoursCheckResponse = await fetch(`/api/restaurants/${restaurant.id}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (hoursCheckResponse.ok) {
        const hoursData = await hoursCheckResponse.json();
        if (!hoursData.isOpen || hoursData.is_manually_closed) {
          alert('Le restaurant est actuellement fermé. Vous ne pouvez pas passer commande.');
          setSubmitting(false);
          router.push(`/restaurants/${restaurant.id}`);
          return;
        }
      }

      // VALIDATION STRICTE: Vérifier à nouveau que l'adresse est livrable AVANT de créer la commande
      if (!selectedAddress) {
        alert('Veuillez sélectionner une adresse de livraison');
        setSubmitting(false);
        return;
      }

      const finalAddressCheck = `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}, France`;
      const finalCheckResponse = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address: finalAddressCheck })
      });

      if (finalCheckResponse.ok) {
        const finalCheckData = await finalCheckResponse.json();
        if (!finalCheckData.success || finalCheckData.livrable !== true) {
          alert(`Cette adresse n'est plus livrable: ${finalCheckData.message || 'Distance trop importante ou adresse invalide'}`);
          setSubmitting(false);
          return;
        }
        // S'assurer qu'on utilise les frais de livraison les plus récents
        setFraisLivraison(finalCheckData.frais_livraison || 2.50);
      } else {
        console.error('Erreur vérification finale adresse:', finalCheckResponse.status);
        alert('Erreur lors de la vérification de l\'adresse. Veuillez réessayer.');
        setSubmitting(false);
        return;
      }

      // Générer un code de sécurité à 6 chiffres pour la livraison
      const securityCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Créer la commande
      // IMPORTANT: Le champ 'total' doit contenir UNIQUEMENT le montant des articles (sans frais de livraison)
      // Les frais de livraison sont stockés séparément dans 'frais_livraison'
      // Calculer le total en incluant suppléments et tailles
      const cartTotal = savedCart.items?.reduce((sum, item) => {
        const itemPrice = parseFloat(item.prix || item.price || 0);
        const itemQuantity = parseInt(item.quantity || 1, 10);

        // Calculer le prix des suppléments
        let supplementsPrice = 0;
        if (item.supplements && Array.isArray(item.supplements)) {
          supplementsPrice = item.supplements.reduce((supSum, sup) => {
            return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
          }, 0);
        }

        // Calculer le prix de la taille
        let sizePrice = 0;
        if (item.size && item.size.prix) {
          sizePrice = parseFloat(item.size.prix) || 0;
        } else if (item.prix_taille) {
          sizePrice = parseFloat(item.prix_taille) || 0;
        }

        // Total pour cet item = (prix de base + suppléments + taille) * quantité
        const totalItemPrice = (itemPrice + supplementsPrice + sizePrice) * itemQuantity;
        return sum + totalItemPrice;
      }, 0) || 0;
      
      const { data: order, error: orderError } = await supabase
        .from('commandes')
        .insert({
          user_id: user.id,
          restaurant_id: restaurant.id,
          total: cartTotal, // UNIQUEMENT les articles, sans frais de livraison
          frais_livraison: fraisLivraison,
          adresse_livraison: `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}`,
          statut: 'en_attente',
          security_code: securityCode
        })
        .select()
        .single();

      if (orderError) {
        console.error('❌ Erreur création commande:', orderError);
        throw orderError;
      }

      console.log('✅ Commande créée avec succès:', order.id);
      console.log('✅ Order object:', order);

      // Ajouter les détails de commande avec suppléments et tailles
      console.log('📦 Ajout des détails de commande pour', cart.length, 'articles');
      try {
        for (const item of cart) {
          console.log('📦 Traitement article:', item.nom || item.name, 'ID:', item.id);
          // Préparer les suppléments pour la sauvegarde
          let supplementsData = [];
          if (item.supplements && Array.isArray(item.supplements)) {
            supplementsData = item.supplements.map(sup => ({
              nom: sup.nom || sup.name || 'Supplément',
              prix: parseFloat(sup.prix || sup.price || 0) || 0
            }));
          }

          // Calculer le prix unitaire total (base + suppléments + taille)
          const itemPrice = parseFloat(item.prix || item.price || 0);
          const supplementsPrice = supplementsData.reduce((sum, sup) => sum + (sup.prix || 0), 0);
          const sizePrice = item.size?.prix ? parseFloat(item.size.prix) : (item.prix_taille ? parseFloat(item.prix_taille) : 0);
          const prixUnitaireTotal = itemPrice + supplementsPrice + sizePrice;

          console.log('📦 Insertion détail commande pour article:', item.id);
          
          // Préparer les données d'insertion
          const insertData = {
            commande_id: order.id,
            plat_id: item.id,
            quantite: item.quantity || 1,
            prix_unitaire: prixUnitaireTotal
          };
          
          // Ajouter supplements seulement s'il y en a
          if (supplementsData.length > 0) {
            insertData.supplements = supplementsData;
          }
          
          const { error: detailError } = await supabase
            .from('details_commande')
            .insert(insertData);

          if (detailError) {
            console.error('❌ Erreur détail commande:', detailError);
            throw new Error(`Erreur lors de l'ajout des détails de commande: ${detailError.message}`);
          }
          console.log('✅ Détail commande ajouté pour article:', item.id);
        }
        console.log('✅ Tous les détails de commande ont été ajoutés');
      } catch (detailLoopError) {
        console.error('❌ Erreur dans la boucle des détails:', detailLoopError);
        throw detailLoopError;
      }

      // Notifier le restaurant (ne pas bloquer la commande si la notification échoue)
      try {
        console.log('📧 Envoi notification restaurant...');
        await fetch('/api/partner/notifications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            restaurantId: restaurant.id,
            type: 'new_order',
            message: `Nouvelle commande #${order.id} - ${totalAvecLivraison.toFixed(2)}€`,
            orderId: order.id
          })
        });
        console.log('✅ Notification envoyée');
      } catch (notificationError) {
        // Ne pas bloquer la commande si la notification échoue
        console.warn('⚠️ Erreur notification (non bloquante):', notificationError);
      }

      // Vider le panier
      safeLocalStorage.removeItem('cart');
      setCart([]);

      console.log('✅ Panier vidé');
      console.log('✅ Commande finale créée, ID:', order.id);
      console.log('✅ Redirection vers:', `/track-order?orderId=${order.id}`);
      
      // Réinitialiser le state de soumission AVANT la redirection
      setSubmitting(false);
      
      // Stocker l'ID de commande pour la redirection
      const orderId = order.id;
      const redirectUrl = `/track-order?orderId=${orderId}`;
      
      console.log('🔄 Tentative de redirection vers:', redirectUrl);
      
      // Forcer la redirection avec plusieurs méthodes pour garantir qu'elle fonctionne
      // Utiliser window.location.replace() qui est plus fiable que href
      // Utiliser setTimeout pour s'assurer que tout le code est exécuté avant la redirection
      setTimeout(() => {
        try {
          console.log('🔄 Exécution redirection...');
          // Méthode 1: window.location.replace (remplace l'historique, plus fiable)
          window.location.replace(redirectUrl);
        } catch (e) {
          console.error('❌ Erreur window.location.replace:', e);
          try {
            // Méthode 2: window.location.href (fallback)
            window.location.href = redirectUrl;
          } catch (e2) {
            console.error('❌ Erreur window.location.href:', e2);
            try {
              // Méthode 3: router.push (dernier recours)
              router.push(redirectUrl);
            } catch (e3) {
              console.error('❌ Toutes les méthodes de redirection ont échoué:', e3);
              // Afficher un message à l'utilisateur
              alert(`Commande créée avec succès ! ID: ${orderId}. Redirection manuelle nécessaire.`);
            }
          }
        }
      }, 100); // Petit délai pour garantir que tout est traité
    } catch (error) {
      // Traduire les erreurs en français
      let errorMessage = 'Erreur lors de la création de la commande';
      if (error.message) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
        } else if (error.message.includes('permission') || error.message.includes('auth')) {
          errorMessage = 'Erreur d\'authentification. Veuillez vous reconnecter.';
        } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
          errorMessage = 'Cette commande existe déjà. Vérifiez votre historique.';
        } else {
          errorMessage = `Erreur: ${error.message}`;
        }
      }
      alert(errorMessage);
      setSubmitting(false);
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <FaShoppingCart className="h-16 w-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Panier vide</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Votre panier est vide. Ajoutez des articles pour continuer.</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        {/* Bouton retour */}
        <div className="mb-4 sm:mb-6">
          <button
            onClick={() => {
              // Retourner au restaurant si on a un panier avec un restaurant, sinon à l'accueil
              const savedCart = safeLocalStorage.getJSON('cart');
              if (savedCart?.restaurant?.id) {
                router.push(`/restaurants/${savedCart.restaurant.id}`);
              } else {
                router.push('/');
              }
            }}
            className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm sm:text-base"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Retour
          </button>
        </div>
        
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-6 sm:mb-8">Finaliser votre commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Informations de livraison */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-900 dark:text-white">
              <FaMapMarkerAlt className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mr-2" />
              Adresse de livraison
            </h2>

            {/* Adresses existantes */}
            {userAddresses.length > 0 && (
              <div className="mb-4 sm:mb-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm sm:text-base">Adresses enregistrées</h3>
                <div className="space-y-2 sm:space-y-3">
                  {userAddresses.map((address) => (
                    <div
                      key={address.id}
                      onClick={() => handleAddressSelect(address)}
                      className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors min-h-[44px] touch-manipulation ${
                        selectedAddress?.id === address.id
                          ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{address.address}</p>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">{address.postal_code} {address.city}</p>
                        </div>
                        {selectedAddress?.id === address.id && (
                          <FaCheck className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Formulaire nouvelle adresse */}
            {showAddressForm && (
              <div className="border-t dark:border-gray-700 pt-4 sm:pt-6">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 text-sm sm:text-base">Nouvelle adresse</h3>
                <div className="space-y-3 sm:space-y-4">
                  <input
                    type="text"
                    placeholder="Adresse"
                    value={newAddress.address}
                    onChange={(e) => setNewAddress(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    <input
                      type="text"
                      placeholder="Ville"
                      value={newAddress.city}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, city: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                    />
                    <input
                      type="text"
                      placeholder="Code postal"
                      value={newAddress.postal_code}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, postal_code: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                    />
                  </div>
                  <label className="flex items-center min-h-[44px] touch-manipulation">
                    <input
                      type="checkbox"
                      checked={newAddress.is_default}
                      onChange={(e) => setNewAddress(prev => ({ ...prev, is_default: e.target.checked }))}
                      className="mr-2 h-4 w-4"
                    />
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Définir comme adresse par défaut</span>
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
            <div className="border-t dark:border-gray-700 pt-4 sm:pt-6 mt-4 sm:mt-6">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center text-sm sm:text-base">
                <FaUser className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                Informations de contact
              </h3>
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <input
                    type="text"
                    placeholder="Prénom *"
                    value={orderDetails.prenom}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, prenom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                  />
                  <input
                    type="text"
                    placeholder="Nom *"
                    value={orderDetails.nom}
                    onChange={(e) => setOrderDetails(prev => ({ ...prev, nom: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                  />
                </div>
                <input
                  type="tel"
                  placeholder="Téléphone *"
                  value={orderDetails.telephone}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={orderDetails.email}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                />
                <textarea
                  placeholder="Instructions spéciales (optionnel)"
                  value={orderDetails.instructions}
                  onChange={(e) => setOrderDetails(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                />
              </div>
            </div>
          </div>

          {/* Résumé de la commande */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 h-fit">
            <h2 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6 flex items-center text-gray-900 dark:text-white">
              <FaShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 dark:text-blue-400 mr-2" />
              Résumé de la commande
            </h2>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base truncate">{item.nom}</p>
                    <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300">Quantité: {item.quantity}</p>
                  </div>
                  <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base ml-2">
                    {((typeof item.prix === 'number' ? item.prix : Number(item.prix)) * item.quantity).toFixed(2)}€
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t dark:border-gray-700 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span>Sous-total</span>
                <span className="font-semibold">{cartTotal.toFixed(2)}€</span>
              </div>
              <div key={`frais-${forceUpdate}`} className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span className="flex items-center">
                  <FaMotorcycle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Frais de livraison
                </span>
                <span className="font-semibold">{fraisLivraison.toFixed(2)}€</span>
              </div>
              <div key={`total-${forceUpdate}`} className="border-t dark:border-gray-700 pt-2 sm:pt-3">
                <div className="flex justify-between text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                  <span>Total</span>
                  <span>{totalAvecLivraison.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            <button
              onClick={submitOrder}
              disabled={submitting || !selectedAddress || deliveryError !== null}
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

      {/* Modal pop-up d'erreur de livraison */}
      {showErrorModal && deliveryError && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowErrorModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start mb-4">
              <div className="flex-shrink-0">
                <FaTimes className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                  ⚠️ Adresse non livrable
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm sm:text-base mb-3">
                  {deliveryError}
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  Veuillez sélectionner une autre adresse dans la zone de livraison.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setShowErrorModal(false);
                setDeliveryError(null);
              }}
              className="w-full bg-red-600 dark:bg-red-700 text-white py-2 px-4 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 