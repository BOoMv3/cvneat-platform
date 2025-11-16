'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/localStorage';
import PaymentForm from '@/components/PaymentForm';
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

// Réduire les warnings Stripe non critiques en développement
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const originalWarn = console.warn;
  console.warn = function(...args) {
    // Ignorer les warnings Stripe non critiques en développement
    const message = args.join(' ');
    if (
      message.includes('Partitioned cookie') ||
      message.includes('Feature Policy: Skipping') ||
      message.includes('Layout was forced') ||
      message.includes('[Stripe.js] The following payment method types are not activated') ||
      (message.includes('[Stripe.js]') && message.includes('domain'))
    ) {
      // Ne pas afficher ces warnings
      return;
    }
    originalWarn.apply(console, args);
  };
}

function computeCartTotalWithExtras(items = []) {
  if (!Array.isArray(items)) return 0;

  return items.reduce((sum, item) => {
    const itemPrice = parseFloat(item?.prix ?? item?.price ?? 0);
    const itemQuantity = parseInt(item?.quantity ?? 1, 10);

    let supplementsPrice = 0;
    if (item?.supplements && Array.isArray(item.supplements)) {
      supplementsPrice = item.supplements.reduce((supSum, sup) => {
        return supSum + (parseFloat(sup?.prix ?? sup?.price ?? 0) || 0);
      }, 0);
    }

    let meatsPrice = 0;
    if (item?.customizations?.selectedMeats && Array.isArray(item.customizations.selectedMeats)) {
      meatsPrice = item.customizations.selectedMeats.reduce((meatSum, meat) => {
        return meatSum + (parseFloat(meat?.prix ?? meat?.price ?? 0) || 0);
      }, 0);
    }

    let saucesPrice = 0;
    if (item?.customizations?.selectedSauces && Array.isArray(item.customizations.selectedSauces)) {
      saucesPrice = item.customizations.selectedSauces.reduce((sauceSum, sauce) => {
        return sauceSum + (parseFloat(sauce?.prix ?? sauce?.price ?? 0) || 0);
      }, 0);
    }

    let sizePrice = 0;
    if (item?.size?.prix) {
      sizePrice = parseFloat(item.size.prix) || 0;
    } else if (item?.prix_taille) {
      sizePrice = parseFloat(item.prix_taille) || 0;
    }

    const totalItemPrice = (itemPrice + supplementsPrice + meatsPrice + saucesPrice + sizePrice) * itemQuantity;
    return sum + totalItemPrice;
  }, 0) || 0;
}

export default function Checkout() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
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
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [orderData, setOrderData] = useState(null); // Stocker les données de commande avant paiement
  const [newAddress, setNewAddress] = useState({
    address: '',
    city: '',
    postal_code: '',
  instructions: '',
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
      setRestaurant(savedCart.restaurant || null);
      setFraisLivraison(savedCart.frais_livraison || 2.50);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const total = computeCartTotalWithExtras(cart);
    console.log('Recalcul total - cart total:', total, 'frais livraison:', fraisLivraison, 'total avec livraison:', total + (parseFloat(fraisLivraison) || 0), 'forceUpdate:', forceUpdate);
    setCartTotal(total);
    setTotalAvecLivraison(total + (parseFloat(fraisLivraison) || 0));
  }, [cart, fraisLivraison, forceUpdate]);

  // Recalcul automatique des frais de livraison à chaque changement d'adresse ou de panier
  useEffect(() => {
    console.log('useEffect déclenché - selectedAddress:', selectedAddress, 'cart.length:', cart.length);
    if (selectedAddress && cart.length > 0) {
      console.log('Appel calculateDeliveryFee depuis useEffect');
      calculateDeliveryFee(selectedAddress);
    }
  }, [selectedAddress, cart]);

  const buildDeliveryPayload = useCallback((fullAddress) => {
    const savedCart = safeLocalStorage.getJSON('cart');
    const restaurantInfo = restaurant || savedCart?.restaurant || null;
    const subtotal = computeCartTotalWithExtras(cart);

    const payload = {
      deliveryAddress: fullAddress,
      orderAmount: Math.round(subtotal * 100) / 100
    };

    const restaurantId = restaurantInfo?.id ?? restaurantInfo?.restaurant_id ?? restaurantInfo?.uuid ?? null;
    if (restaurantId) {
      payload.restaurantId = restaurantId;
    }

    const restaurantStreet = restaurantInfo?.adresse || restaurantInfo?.address || restaurantInfo?.street;
    const restaurantPostal = restaurantInfo?.code_postal || restaurantInfo?.postal_code;
    const restaurantCity = restaurantInfo?.ville || restaurantInfo?.city;

    let restaurantAddressString;
    if (restaurantStreet || restaurantPostal || restaurantCity) {
      const cityBlock = [restaurantPostal, restaurantCity].filter(Boolean).join(' ').trim();
      restaurantAddressString = [restaurantStreet, cityBlock].filter(Boolean).join(', ').trim();
    }

    if (restaurantAddressString) {
      payload.restaurantAddress = `${restaurantAddressString}, France`.replace(/,\s*,/g, ', ').trim();
    }

    const perKmOverride = restaurantInfo?.frais_livraison_km
      ?? restaurantInfo?.frais_livraison_par_km
      ?? restaurantInfo?.delivery_fee_per_km
      ?? restaurantInfo?.tarif_kilometre
      ?? restaurantInfo?.per_km_fee;

    if (perKmOverride !== undefined && perKmOverride !== null && perKmOverride !== '') {
      payload.perKmRate = perKmOverride;
    }

    const baseFeeOverride = restaurantInfo?.frais_livraison_base
      ?? restaurantInfo?.frais_livraison_minimum
      ?? restaurantInfo?.frais_livraison;

    if (baseFeeOverride !== undefined && baseFeeOverride !== null && baseFeeOverride !== '') {
      payload.baseFee = baseFeeOverride;
    }

    const freeThresholdOverride = restaurantInfo?.livraison_gratuite_seuil
      ?? restaurantInfo?.free_delivery_threshold;

    if (freeThresholdOverride !== undefined && freeThresholdOverride !== null && freeThresholdOverride !== '') {
      payload.freeDeliveryThreshold = freeThresholdOverride;
    }

    return { payload, restaurantInfo, subtotal };
  }, [restaurant, cart]);

  const addNewAddress = async () => {
    if (!newAddress.address || !newAddress.city || !newAddress.postal_code) {
      alert('Veuillez remplir tous les champs');
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        alert('Votre session a expiré. Veuillez vous reconnecter.');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/users/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: `${newAddress.city} - ${newAddress.address}`,
          address: newAddress.address,
          city: newAddress.city,
          postal_code: newAddress.postal_code,
          instructions: newAddress.instructions || '',
          is_default: newAddress.is_default
        })
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Erreur API /api/users/addresses POST:', result);
        throw new Error(result.error || 'Impossible d\'ajouter l\'adresse');
      }

      const createdAddress = result.address;

      setUserAddresses(prev => [...prev, createdAddress]);
      setSelectedAddress(createdAddress);
      setShowAddressForm(false);
      setNewAddress({
        address: '',
        city: '',
        postal_code: '',
        instructions: '',
        is_default: false
      });

      if (cart.length > 0) {
        await calculateDeliveryFee(createdAddress);
      }

      alert('Adresse ajoutée avec succès !');
    } catch (error) {
      console.error('Erreur ajout adresse:', error);
      alert(error.message || 'Erreur lors de l\'ajout de l\'adresse. Veuillez réessayer.');
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

    const { payload, restaurantInfo } = buildDeliveryPayload(fullAddress);

    try {
      console.log('📡 Appel API /api/delivery/calculate...');

      const response = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
        const cartTotalCalc = computeCartTotalWithExtras(cart);
        setTotalAvecLivraison(cartTotalCalc);
        safeLocalStorage.setJSON('cart', {
          items: cart,
          restaurant: restaurantInfo || restaurant || null,
          frais_livraison: 0
        });
        return;
      }

      // SUCCÈS - Réinitialiser les erreurs
      setDeliveryError(null);
      setAddressValidationMessage(null);
      setShowErrorModal(false);

      // SUCCÈS - Mettre à jour les frais
      // IMPORTANT: Arrondir à 2 décimales pour garantir la cohérence
      const newFrais = Math.round(parseFloat(data.frais_livraison || 2.50) * 100) / 100;
      setFraisLivraison(newFrais);
      
      // Recalculer le total du panier avec suppléments, customisations et tailles
      const currentCartTotal = computeCartTotalWithExtras(cart);
      
      setTotalAvecLivraison(currentCartTotal + newFrais);
      setForceUpdate(prev => prev + 1);
      safeLocalStorage.setJSON('cart', {
        items: cart,
        restaurant: restaurantInfo || restaurant || null,
        frais_livraison: newFrais
      });

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

  // Fonction pour préparer la commande et créer le PaymentIntent Stripe
  const prepareOrderAndPayment = async () => {
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
      const restaurantInfoFromStorage = savedCart?.restaurant || null;
      const activeRestaurant = restaurant || restaurantInfoFromStorage;

      if (!activeRestaurant) {
        alert('Erreur: Restaurant non trouvé');
        setSubmitting(false);
        return;
      }

      // Vérifier si le restaurant est ouvert
      const hoursCheckResponse = await fetch(`/api/restaurants/${activeRestaurant.id}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (hoursCheckResponse.ok) {
        const hoursData = await hoursCheckResponse.json();
        if (!hoursData.isOpen || hoursData.is_manually_closed) {
          alert('Le restaurant est actuellement fermé. Vous ne pouvez pas passer commande.');
          setSubmitting(false);
          router.push(`/restaurants/${activeRestaurant.id}`);
          return;
        }
      }

      // VALIDATION STRICTE: Vérifier à nouveau que l'adresse est livrable
      // IMPORTANT: Utiliser les frais déjà calculés si disponibles et l'adresse est la même
      const finalAddressCheck = `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}, France`;
      const { payload: finalPayload, subtotal: orderSubtotal, restaurantInfo: payloadRestaurantInfo } = buildDeliveryPayload(finalAddressCheck);
      const resolvedRestaurant = activeRestaurant || payloadRestaurantInfo || null;
      
      if (!resolvedRestaurant) {
        alert('Impossible de déterminer le restaurant pour cette commande.');
        setSubmitting(false);
        return;
      }
      
      // Si les frais de livraison ont déjà été calculés pour cette adresse, les réutiliser
      // Sinon, recalculer pour valider
      let finalDeliveryFee = fraisLivraison;
      let finalCheckData = null;
      
      // Vérifier si les frais sont déjà calculés et valides (supérieurs à 0)
      if (fraisLivraison && fraisLivraison > 0) {
        console.log('💰 Réutilisation des frais de livraison déjà calculés:', fraisLivraison);
        // Utiliser les frais déjà calculés, mais vérifier quand même que l'adresse est livrable
        finalCheckData = {
          success: true,
          livrable: true,
          frais_livraison: Math.round(parseFloat(fraisLivraison) * 100) / 100
        };
        finalDeliveryFee = finalCheckData.frais_livraison;
      } else {
        // Recalculer uniquement si les frais n'ont pas été calculés
        const finalCheckResponse = await fetch('/api/delivery/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalPayload)
        });

        if (finalCheckResponse.ok) {
          finalCheckData = await finalCheckResponse.json();
          if (!finalCheckData.success || finalCheckData.livrable !== true) {
            alert(`Cette adresse n'est plus livrable: ${finalCheckData.message || 'Distance trop importante ou adresse invalide'}`);
            setSubmitting(false);
            return;
          }
          // IMPORTANT: Arrondir les frais de livraison à 2 décimales pour garantir la cohérence
          const roundedDeliveryFee = Math.round(parseFloat(finalCheckData.frais_livraison || 2.50) * 100) / 100;
          setFraisLivraison(roundedDeliveryFee);
          // Mettre à jour finalCheckData avec la valeur arrondie pour garantir la cohérence
          finalCheckData.frais_livraison = roundedDeliveryFee;
          finalDeliveryFee = roundedDeliveryFee;
        } else {
          // Gestion spécifique de l'erreur 429 (Rate Limit)
          if (finalCheckResponse.status === 429) {
            alert('Trop de requêtes pour la vérification de l\'adresse. Veuillez patienter quelques instants avant de réessayer.');
            setSubmitting(false);
            return;
          }
          
          console.error('Erreur vérification finale adresse:', finalCheckResponse.status);
          alert(`Erreur lors de la vérification de l'adresse (${finalCheckResponse.status}). Veuillez réessayer.`);
          setSubmitting(false);
          return;
        }
      }

      // Calculer le total du panier (sous-total articles)
      const cartTotal = orderSubtotal || computeCartTotalWithExtras(savedCart.items);

      // PROMOTION -20% financée par CVN'EAT avec garde-fous
      const DISCOUNT_RATE = 0.20;          // -20%
      const MIN_SUBTOTAL_FOR_DISCOUNT = 20; // Panier mini 20€
      const PLATFORM_FEE = 0.49;           // Frais plateforme fixe

      // Calcul de la remise (sur sous-total uniquement, hors livraison/suppléments déjà inclus dans cartTotal)
      const rawDiscount = cartTotal >= MIN_SUBTOTAL_FOR_DISCOUNT ? cartTotal * DISCOUNT_RATE : 0;
      const discountAmount = Math.round((rawDiscount) * 100) / 100;

      // IMPORTANT: Utiliser les frais arrondis pour le calcul du total
      // Utiliser finalDeliveryFee qui a été calculé ci-dessus
      const finalDeliveryFeeForTotal = Math.round(parseFloat(finalDeliveryFee || fraisLivraison || 2.50) * 100) / 100;
      // Montant facturé au client = sous-total - remise + livraison + frais plateforme
      const totalAmount = Math.max(0, (cartTotal - discountAmount) + finalDeliveryFeeForTotal + PLATFORM_FEE);

      // Générer un code de sécurité
      const securityCode = Math.floor(100000 + Math.random() * 900000).toString();

      console.log('💰 Frais de livraison finaux:', {
        finalCheckData: finalCheckData?.frais_livraison,
        fraisLivraison,
        finalDeliveryFee,
        finalDeliveryFeeForTotal,
        'différence': Math.abs(finalDeliveryFeeForTotal - (fraisLivraison || 0))
      });
      
      // Préparer les données de commande (on les stocke pour créer la commande après le paiement)
      const customerFirstName = orderDetails.prenom?.trim() || '';
      const customerLastName = orderDetails.nom?.trim() || '';
      const customerPhone = orderDetails.telephone?.trim() || '';
      const customerEmail = orderDetails.email?.trim() || (user.email || '');

      const orderDataToStore = {
        user_id: user.id,
        restaurant_id: resolvedRestaurant.id,
        total: cartTotal,
        frais_livraison: finalDeliveryFeeForTotal, // Utiliser la valeur arrondie et cohérente
        discount_amount: discountAmount,
        platform_fee: PLATFORM_FEE,
        adresse_livraison: `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}`,
        security_code: securityCode,
        cart: savedCart.items,
        orderDetails,
        customer_first_name: customerFirstName,
        customer_last_name: customerLastName,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        delivery_info: {
          address: selectedAddress.address,
          city: selectedAddress.city,
          postalCode: selectedAddress.postal_code,
          instructions: orderDetails.instructions?.trim() || ''
        }
      };
      setOrderData(orderDataToStore);

      // Créer le PaymentIntent Stripe
      console.log('💳 Création PaymentIntent Stripe pour montant:', totalAmount, 'avec remise:', discountAmount, 'frais plateforme:', PLATFORM_FEE);
      const paymentResponse = await fetch('/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'eur',
          metadata: {
            user_id: user.id,
            restaurant_id: resolvedRestaurant.id,
            cart_total: cartTotal.toString(),
            delivery_fee: finalDeliveryFeeForTotal.toString(),
            discount_amount: discountAmount.toString(),
            platform_fee: PLATFORM_FEE.toString()
          }
        })
      });

      if (!paymentResponse.ok) {
        // Gestion spécifique de l'erreur 429 (Rate Limit)
        if (paymentResponse.status === 429) {
          const errorMessage = 'Trop de requêtes. Veuillez patienter quelques instants avant de réessayer.';
          alert(errorMessage);
          setSubmitting(false);
          return;
        }
        
        let errorData;
        try {
          errorData = await paymentResponse.json();
        } catch {
          errorData = { error: `Erreur HTTP ${paymentResponse.status}` };
        }
        throw new Error(errorData.error || `Erreur lors de la création du paiement (${paymentResponse.status})`);
      }

      const paymentData = await paymentResponse.json();
      setPaymentIntentId(paymentData.paymentIntentId);
      
      // Stocker le clientSecret pour le formulaire de paiement
      setClientSecret(paymentData.clientSecret);
      
      // Afficher le formulaire de paiement
      setShowPaymentForm(true);
      setSubmitting(false);
      
    } catch (error) {
      console.error('❌ Erreur préparation commande:', error);
      
      // Gestion spécifique de l'erreur 429
      if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Trop de requêtes'))) {
        alert('⚠️ Trop de requêtes ont été effectuées. Veuillez patienter quelques instants avant de réessayer.');
      } else {
        alert(error.message || 'Erreur lors de la préparation de la commande');
      }
      
      setSubmitting(false);
    }
  };

  // Fonction pour créer la commande après paiement réussi
  const createOrderAfterPayment = async (confirmedPaymentIntentId) => {
    if (!orderData) {
      throw new Error('Données de commande manquantes');
    }

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const payload = {
      restaurantId: orderData.restaurant_id,
      deliveryInfo: orderData.delivery_info || {
        address: orderData.orderDetails?.adresse || '',
        city: orderData.orderDetails?.ville || '',
        postalCode: orderData.orderDetails?.code_postal || '',
        instructions: orderData.orderDetails?.instructions || ''
      },
      items: orderData.cart || [],
      deliveryFee: orderData.frais_livraison || 0,
      totalAmount: orderData.total || 0,
      discountAmount: orderData.discount_amount || 0,
      platformFee: orderData.platform_fee || 0,
      paymentIntentId: confirmedPaymentIntentId,
      paymentStatus: 'paid',
      customerInfo: {
        firstName: orderData.customer_first_name,
        lastName: orderData.customer_last_name,
        phone: orderData.customer_phone,
        email: orderData.customer_email
      }
    };

    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur lors de la création de la commande' }));
      throw new Error(errorData.error || 'Erreur lors de la création de la commande');
    }

    const result = await response.json();
    const orderId = result.orderId || result.order?.id;
    const securityCode = result.securityCode || result.security_code || result.order?.security_code;
    if (!orderId) {
      throw new Error('Commande créée mais identifiant introuvable');
    }

    // Nettoyer le panier après la création de la commande
    safeLocalStorage.removeItem('cart');

    // Rediriger vers la page de confirmation
    if (typeof window !== 'undefined' && securityCode) {
      try {
        sessionStorage.setItem(`order-code-${orderId}`, securityCode);
      } catch (e) {
        console.warn('Impossible de stocker le code commande en session:', e);
      }
    }

    const redirectUrl = securityCode
      ? `/order-confirmation/${orderId}?code=${encodeURIComponent(securityCode)}`
      : `/order-confirmation/${orderId}`;
    setTimeout(() => {
      try {
        window.location.replace(redirectUrl);
      } catch (e) {
        try {
          window.location.href = redirectUrl;
        } catch (e2) {
          router.push(redirectUrl);
        }
      }
    }, 500);

    return result;
  };

  // Gestionnaires pour le formulaire de paiement
  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('✅ Paiement confirmé, création de la commande...');
      setSubmitting(true);
      await createOrderAfterPayment(paymentIntentId);
      setSubmitting(false);
    } catch (error) {
      console.error('❌ Erreur après paiement:', error);
      setSubmitting(false);
      const errorMessage = error.message || 'Erreur lors de la création de la commande';
      alert(`Paiement réussi mais ${errorMessage}. Contactez le support si le problème persiste.`);
      // Ne pas fermer le formulaire de paiement pour permettre une nouvelle tentative
    }
  };

  const handlePaymentError = (error) => {
    console.error('❌ Erreur paiement:', error);
    alert(`Erreur de paiement: ${error}`);
    setShowPaymentForm(false);
    setSubmitting(false);
  };

  const submitOrder = async () => {
    // Préparer la commande et afficher le formulaire de paiement
    await prepareOrderAndPayment();
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-2 fold:py-2 xs:py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 fold:px-2 xs:px-3 sm:px-4">
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
        
        <h1 className="text-base fold:text-base xs:text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-4 fold:mb-4 xs:mb-6 sm:mb-8">Finaliser votre commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 fold:gap-2 xs:gap-4 sm:gap-6 lg:gap-8">
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
                <textarea
                  placeholder="Instructions de livraison (optionnel)"
                  value={newAddress.instructions}
                  onChange={(e) => setNewAddress(prev => ({ ...prev, instructions: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white min-h-[44px] touch-manipulation"
                />
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

            {(() => {
              // Calcul promo pour l'affichage
              const DISCOUNT_RATE = 0.20;
              const MIN_SUBTOTAL_FOR_DISCOUNT = 20;
              const PLATFORM_FEE = 0.49;
              const discountDisplay = cartTotal >= MIN_SUBTOTAL_FOR_DISCOUNT ? Math.round(cartTotal * DISCOUNT_RATE * 100) / 100 : 0;
              const finalTotalDisplay = Math.max(0, (cartTotal - discountDisplay) + fraisLivraison + PLATFORM_FEE);
              return (
            <div className="border-t dark:border-gray-700 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span>Sous-total</span>
                <span className="font-semibold">{cartTotal.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                <span>Remise -20% (CVN’EAT)</span>
                <span className="font-semibold text-green-700 dark:text-green-400">−{discountDisplay.toFixed(2)}€</span>
              </div>
              <div key={`frais-${forceUpdate}`} className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span className="flex items-center">
                  <FaMotorcycle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Frais de livraison
                </span>
                <span className="font-semibold">{fraisLivraison.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                <span>Frais plateforme</span>
                <span className="font-semibold">{PLATFORM_FEE.toFixed(2)}€</span>
              </div>
              <div key={`total-${forceUpdate}`} className="border-t dark:border-gray-700 pt-2 sm:pt-3">
                <div className="flex justify-between text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                  <span>Total</span>
                  <span>{finalTotalDisplay.toFixed(2)}€</span>
                </div>
              </div>
            </div>
              );
            })()}

            {!showPaymentForm ? (
              <button
                onClick={submitOrder}
                disabled={submitting || !selectedAddress || deliveryError !== null}
                className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 min-h-[44px] touch-manipulation"
              >
                {submitting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                    Préparation...
                  </div>
                ) : (
                  // Recalculer le total payé avec remise et frais plateforme
                  (() => {
                    const DISCOUNT_RATE = 0.20;
                    const MIN_SUBTOTAL_FOR_DISCOUNT = 20;
                    const PLATFORM_FEE = 0.49;
                    const discountDisplay = cartTotal >= MIN_SUBTOTAL_FOR_DISCOUNT ? Math.round(cartTotal * DISCOUNT_RATE * 100) / 100 : 0;
                    const finalTotalDisplay = Math.max(0, (cartTotal - discountDisplay) + fraisLivraison + PLATFORM_FEE);
                    return `Payer ${finalTotalDisplay.toFixed(2)}€`;
                  })()
                )}
              </button>
            ) : (
              <div className="mt-4 sm:mt-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                  <FaCreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  Paiement
                </h3>
                {clientSecret && (
                  <PaymentForm
                    amount={(() => {
                      const DISCOUNT_RATE = 0.20;
                      const MIN_SUBTOTAL_FOR_DISCOUNT = 20;
                      const PLATFORM_FEE = 0.49;
                      const discountDisplay = cartTotal >= MIN_SUBTOTAL_FOR_DISCOUNT ? Math.round(cartTotal * DISCOUNT_RATE * 100) / 100 : 0;
                      return Math.max(0, (cartTotal - discountDisplay) + fraisLivraison + PLATFORM_FEE);
                    })()}
                    paymentIntentId={paymentIntentId}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    discount={(orderData?.discount_amount) ?? (() => {
                      const DISCOUNT_RATE = 0.20;
                      const MIN_SUBTOTAL_FOR_DISCOUNT = 20;
                      return cartTotal >= MIN_SUBTOTAL_FOR_DISCOUNT ? Math.round(cartTotal * DISCOUNT_RATE * 100) / 100 : 0;
                    })()}
                    platformFee={(orderData?.platform_fee) ?? 0.49}
                  />
                )}
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentIntentId(null);
                    setClientSecret(null);
                    setOrderData(null);
                  }}
                  className="w-full mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm sm:text-base"
                >
                  Annuler et retourner
                </button>
              </div>
            )}
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