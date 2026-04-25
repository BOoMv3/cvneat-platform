'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { safeLocalStorage } from '@/lib/localStorage';
import PaymentForm from '@/components/PaymentForm';
import { FacebookPixelEvents } from '@/components/FacebookPixel';
import PromoCodeInput from '@/components/PromoCodeInput';
import SupportContactBlock from '@/components/SupportContactBlock';
// PROMO TERMINÉE : Plus besoin du composant FreeDeliveryBanner
// import FreeDeliveryBanner from '@/components/FreeDeliveryBanner';
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
  FaCheck,
  FaTag,
  FaCloudRain,
  FaGift
} from 'react-icons/fa';
import { getItemLineTotal, computeCartTotalWithExtras, reconcileCartWithMenu, cartHasAlcohol } from '@/lib/cartUtils';
import { LOYALTY_REWARDS_CATALOG, LOYALTY_CHECKOUT_HELP, computeLoyaltyAdjustments } from '@/lib/loyalty-rewards';
import {
  SECOND_ARTICLE_PROMO_CHECKOUT_LINE,
  computeSecondArticlePromoDiscountFromItems,
} from '@/lib/platform-promo';
import {
  CVNEAT_PLUS_NAME,
  CVNEAT_PLUS_MIN_ORDER_EUR,
  cvneatPlusEligibilityForDeliveryDiscount,
  applyCvneatPlusHalfOnDelivery,
  cvneatPlusAppliesToPlatformFeeWaiver,
} from '@/lib/cvneat-plus';
import { getTonightAutoPromo } from '@/lib/tonight-promo';

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

export default function Checkout() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [cartTotal, setCartTotal] = useState(0);
  const [fraisLivraison, setFraisLivraison] = useState(2.50); // Base 2,50€ + 0,50€/km
  const [totalAvecLivraison, setTotalAvecLivraison] = useState(0);
  const [forceUpdate, setForceUpdate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [deliveryError, setDeliveryError] = useState(null);
  const [deliveryNotice, setDeliveryNotice] = useState(null);
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
  const [promoCode, setPromoCode] = useState('');
  const [promoCodeValid, setPromoCodeValid] = useState(null); // null = pas vérifié, {valid: true/false, discount: number, message: string}
  const [appliedPromoCode, setAppliedPromoCode] = useState(null); // Code promo appliqué
  const [orderDetails, setOrderDetails] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    instructions: ''
  });
  const [userPoints, setUserPoints] = useState(0);
  /** Récompense catalogue sélectionnée (coût en points fixe, pas conversion pt → €) */
  const [selectedLoyaltyRewardId, setSelectedLoyaltyRewardId] = useState(null);
  /** Menu chargé pour détecter les articles marqués alcool (contains_alcohol) */
  const [menuCatalogSnapshot, setMenuCatalogSnapshot] = useState([]);
  const [alcoholAttestationChecked, setAlcoholAttestationChecked] = useState(false);

  // Fermeture des livraisons pour ce soir (météo) - DÉSACTIVÉ pour Noël
  // Mettre à true pour fermer les livraisons manuellement
  const [deliveryClosed, setDeliveryClosed] = useState(false);
  const deliveryClosedMessage = "En raison des conditions météorologiques actuelles, aucune livraison ne sera effectuée ce soir. Merci de votre compréhension.";

  // Fermeture globale des commandes (ex: pas de livreur) - contrôlé par API
  const [ordersOpen, setOrdersOpen] = useState(true);

  /** Derniers frais retournés par l’API livraison (hors marge « CVN'Plus ») */
  const [deliveryFromApi, setDeliveryFromApi] = useState(null);
  const [cvneatPlus, setCvneatPlus] = useState({ active: false, loaded: false });

  const cvneatPlusHalfOffLayer = useMemo(() => {
    if (!cvneatPlus.active) return false;
    const maxDiscount = Math.min(appliedPromoCode?.discountAmount || 0, cartTotal);
    const subAfterPromo = Math.max(0, cartTotal - maxDiscount);
    return cvneatPlusEligibilityForDeliveryDiscount({
      subtotalAfterPromoEur: subAfterPromo,
      promoFreeDelivery: appliedPromoCode?.discountType === 'free_delivery',
      loyaltyRewardId: selectedLoyaltyRewardId,
    });
  }, [cvneatPlus.active, appliedPromoCode, cartTotal, selectedLoyaltyRewardId]);

  const cvneatPlusPlatformFeeFreeLayer = useMemo(() => {
    if (!cvneatPlus.active) return false;
    const maxDiscount = Math.min(appliedPromoCode?.discountAmount || 0, cartTotal);
    const subAfterPromo = Math.max(0, cartTotal - maxDiscount);
    return cvneatPlusAppliesToPlatformFeeWaiver({
      subtotalAfterPromoEur: subAfterPromo,
      promoFreeDelivery: appliedPromoCode?.discountType === 'free_delivery',
      loyaltyRewardId: selectedLoyaltyRewardId,
    });
  }, [cvneatPlus.active, appliedPromoCode, cartTotal, selectedLoyaltyRewardId]);

  const applyCvneatToRawDelivery = useCallback(
    (raw) => {
      const r = Math.round(parseFloat(raw || 0) * 100) / 100;
      if (cvneatPlusHalfOffLayer && r > 0) return applyCvneatPlusHalfOnDelivery(r);
      return r;
    },
    [cvneatPlusHalfOffLayer]
  );

  const loyaltyCheckout = useMemo(() => {
    const tonightPromo = getTonightAutoPromo(cartTotal);
    const autoPromoDiscount = tonightPromo.eligible ? tonightPromo.discountEur : 0;
    const discountAmount = (appliedPromoCode?.discountAmount || 0) + autoPromoDiscount;
    const maxDiscount = Math.min(discountAmount, cartTotal);
    const promoFree = appliedPromoCode?.discountType === 'free_delivery';
    const deliveryBeforeLoyalty = promoFree
      ? 0
      : Math.round(parseFloat(fraisLivraison || 0) * 100) / 100;
    const adj = computeLoyaltyAdjustments({
      rewardId: selectedLoyaltyRewardId,
      cartSubtotalEur: cartTotal,
      promoDiscountEur: maxDiscount,
      promoFreeDelivery: promoFree,
      deliveryFeeEur: deliveryBeforeLoyalty,
    });
    const PLATFORM_FEE = cvneatPlusPlatformFeeFreeLayer ? 0 : 0.49;
    const subAfterPromo = Math.max(0, cartTotal - maxDiscount);
    const subAfterAll = Math.max(
      0,
      Math.round((subAfterPromo - adj.extraDiscountOnSubtotal) * 100) / 100
    );
    const platformPromoDiscount = computeSecondArticlePromoDiscountFromItems(cart, {
      capAt: subAfterAll,
    });
    const totalToPay = Math.max(
      0.5,
      Math.round((subAfterAll - platformPromoDiscount + adj.deliveryFeeEurAfter + PLATFORM_FEE) * 100) / 100
    );
    const rewardMeta = selectedLoyaltyRewardId
      ? LOYALTY_REWARDS_CATALOG.find((r) => r.id === selectedLoyaltyRewardId)
      : null;
    return {
      cartTotal,
      autoPromoDiscount,
      tonightPromoEligible: tonightPromo.eligible,
      maxDiscount,
      promoFree,
      deliveryBeforeLoyalty,
      adj,
      PLATFORM_FEE,
      subAfterPromo,
      subAfterAll,
      platformPromoDiscount,
      totalToPay,
      rewardMeta,
    };
  }, [
    cart,
    cartTotal,
    appliedPromoCode,
    fraisLivraison,
    selectedLoyaltyRewardId,
    cvneatPlusPlatformFeeFreeLayer,
  ]);

  const cartContainsAlcohol = useMemo(
    () => cartHasAlcohol(cart, menuCatalogSnapshot),
    [cart, menuCatalogSnapshot]
  );

  useEffect(() => {
    if (!cartContainsAlcohol) setAlcoholAttestationChecked(false);
  }, [cartContainsAlcohol]);

  useEffect(() => {
    if (deliveryFromApi == null) return;
    const w = applyCvneatToRawDelivery(deliveryFromApi);
    setFraisLivraison(w);
  }, [deliveryFromApi, applyCvneatToRawDelivery]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        // Sauvegarder l'intention de checkout avant de rediriger
        if (typeof window !== 'undefined') {
          localStorage.setItem('redirectAfterLogin', '/checkout');
          // S'assurer que le panier est bien sauvegardé
          const savedCart = safeLocalStorage.getJSON('cart');
          if (savedCart) {
            safeLocalStorage.setJSON('cart', savedCart);
          }
        }
        router.push('/login?redirect=checkout');
        return;
      }
      setUser(user);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        try {
          const vres = await fetch('/api/cvneat-plus/status', {
            headers: { Authorization: `Bearer ${token}` },
            cache: 'no-store',
          });
          if (vres.ok) {
            const vj = await vres.json();
            setCvneatPlus({ active: !!vj.active, loaded: true });
          } else {
            setCvneatPlus({ active: false, loaded: true });
          }
        } catch {
          setCvneatPlus({ active: false, loaded: true });
        }
      } else {
        setCvneatPlus({ active: false, loaded: true });
      }
      
      // Charger les données utilisateur
      const { data: userData } = await supabase
        .from('users')
        .select('nom, prenom, telephone, points_fidelite')
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
        setUserPoints(userData.points_fidelite || 0);
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
    // Charger le panier depuis le localStorage (source de vérité)
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart && Array.isArray(savedCart.items)) {
      setCart(savedCart.items);
      setRestaurant(savedCart.restaurant || null);
      setFraisLivraison(savedCart.frais_livraison || 2.50);
    }
    setLoading(false);
  }, []);

  // Réconcilier le panier avec les prix actuels du menu (Dashboard = Page = Paiement)
  useEffect(() => {
    if (!cart.length) return;
    const restId = restaurant?.id ?? restaurant?.restaurant_id ?? restaurant?.uuid ?? null;
    if (!restId) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/restaurants/${restId}/menu`, { cache: 'no-store' });
        if (!res.ok || cancelled) return;
        const menuItems = await res.json();
        if (!Array.isArray(menuItems) || cancelled) return;

        if (!cancelled) setMenuCatalogSnapshot(menuItems);

        const { items: reconciled, changed } = reconcileCartWithMenu(cart, menuItems);
        if (changed && !cancelled) {
          setCart(reconciled);
          const saved = safeLocalStorage.getJSON('cart') || {};
          safeLocalStorage.setJSON('cart', { ...saved, items: reconciled });
          setForceUpdate((u) => u + 1);
        }
      } catch (e) {
        console.warn('Réconciliation panier/menu:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [cart.length, restaurant?.id, restaurant?.restaurant_id, restaurant?.uuid]);

  // Resynchroniser le panier avec le localStorage quand la page redevient visible (ex: autre onglet modifié)
  useEffect(() => {
    const syncCart = () => {
      const savedCart = safeLocalStorage.getJSON('cart');
      if (savedCart && Array.isArray(savedCart.items)) {
        setCart(savedCart.items);
        if (savedCart.frais_livraison != null) setFraisLivraison(savedCart.frais_livraison);
      }
    };
    const onVisibility = () => { if (document.visibilityState === 'visible') syncCart(); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  useEffect(() => {
    const checkOrdersOpen = async () => {
      try {
        const res = await fetch('/api/platform/orders-open');
        const data = await res.json();
        setOrdersOpen(data.open !== false);
      } catch {
        setOrdersOpen(true); // En cas d'erreur, on laisse passer
      }
    };
    checkOrdersOpen();
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
        setDeliveryNotice(null);
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
      setDeliveryNotice(data.delivery_notice || null);
      setAddressValidationMessage(null);
      setShowErrorModal(false);

      // SUCCÈS - Mettre à jour les frais (calculés par l'API: 2,50€ + 0,50€/km)
      // IMPORTANT: Arrondir à 2 décimales pour garantir la cohérence
      const newFrais = Math.round(parseFloat(data.frais_livraison || 2.50) * 100) / 100;
      setDeliveryFromApi(newFrais);
      const withCvneat = applyCvneatToRawDelivery(newFrais);
      setFraisLivraison(withCvneat);
      
      // Recalculer le total du panier avec suppléments, customisations et tailles
      const currentCartTotal = computeCartTotalWithExtras(cart);
      
      setTotalAvecLivraison(currentCartTotal + withCvneat);
      setForceUpdate(prev => prev + 1);
      safeLocalStorage.setJSON('cart', {
        items: cart,
        restaurant: restaurantInfo || restaurant || null,
        frais_livraison: withCvneat,
      });

    } catch (error) {
      setDeliveryNotice(null);
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
    setDeliveryNotice(null);
    setAddressValidationMessage(null);
    setShowErrorModal(false);
    await calculateDeliveryFee(address);
  };

  // Fonction SIMPLIFIÉE pour créer la commande et préparer le paiement
  const prepareOrderAndPayment = async () => {
    // Vérifier si les commandes sont fermées globalement
    if (!ordersOpen) {
      alert('Maintenance en cours. Les commandes sont temporairement indisponibles. Merci de réessayer plus tard.');
      return;
    }
    // Vérifier si les livraisons sont fermées (manuel)
    if (deliveryClosed) {
      alert(deliveryClosedMessage);
      return;
    }

    // Validation minimale
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

      // Vérifier si le restaurant est ouvert (sans cache pour avoir la réponse à jour)
      const hoursCheckResponse = await fetch(`/api/restaurants/${activeRestaurant.id}/hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });

      if (hoursCheckResponse.ok) {
        const hoursData = await hoursCheckResponse.json();
        const isOpen = hoursData.isOpen === true;
        const isManuallyClosed = hoursData.isManuallyClosed === true || hoursData.is_manually_closed === true;
        if (!isOpen || isManuallyClosed) {
          alert('Le restaurant est actuellement fermé. Vous ne pouvez pas passer commande.');
          setSubmitting(false);
          router.push(`/restaurant-view?id=${encodeURIComponent(activeRestaurant.id)}`);
          return;
        }
      }

      // IMPORTANT: Recalculer les frais de livraison AVANT le paiement pour garantir l'exactitude
      console.log('🔄 Recalcul des frais de livraison avant paiement...');
      const fullAddress = `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}, France`;
      
      // Recalculer les frais de livraison
      const recalculateResponse = await fetch('/api/delivery/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: fullAddress,
          deliveryAddress: fullAddress,
          restaurantId: activeRestaurant.id
        })
      });

      if (!recalculateResponse.ok) {
        const errorData = await recalculateResponse.json();
        alert(`Erreur de calcul des frais de livraison: ${errorData.message || 'Adresse non livrable'}`);
        setSubmitting(false);
        return;
      }

      const recalculateData = await recalculateResponse.json();
      
      if (!recalculateData.success || !recalculateData.livrable) {
        alert(`Livraison impossible: ${recalculateData.message || 'Adresse trop éloignée'}`);
        setSubmitting(false);
        return;
      }
      setDeliveryNotice(recalculateData.delivery_notice || null);

      // Utiliser les frais recalculés (garantis corrects)
      let finalDeliveryFee = Math.round(parseFloat(recalculateData.frais_livraison || 0) * 100) / 100;
      
      // Vérification de sécurité : minimum 2,50 € seulement si des frais sont facturés
      if (finalDeliveryFee > 0 && finalDeliveryFee < 2.5) {
        console.warn('⚠️ Frais de livraison anormalement bas, utilisation du minimum');
        finalDeliveryFee = 2.5;
      }

      const discountPre = appliedPromoCode?.discountAmount || 0;
      const maxD = Math.min(discountPre, cartTotal);
      const subAfterPromoForCvneat = Math.max(0, cartTotal - maxD);
      const { data: sessV } = await supabase.auth.getSession();
      if (sessV?.session?.access_token) {
        const vres = await fetch('/api/cvneat-plus/status', {
          headers: { Authorization: `Bearer ${sessV.session.access_token}` },
          cache: 'no-store',
        });
        if (vres.ok) {
          const vj = await vres.json();
          if (
            vj.active &&
            cvneatPlusEligibilityForDeliveryDiscount({
              subtotalAfterPromoEur: subAfterPromoForCvneat,
              promoFreeDelivery: appliedPromoCode?.discountType === 'free_delivery',
              loyaltyRewardId: selectedLoyaltyRewardId,
            })
          ) {
            finalDeliveryFee = applyCvneatPlusHalfOnDelivery(finalDeliveryFee);
          }
        }
      }

      console.log('✅ Frais de livraison recalculés:', finalDeliveryFee, '€');

      const { payload: finalPayload, restaurantInfo: payloadRestaurantInfo } = buildDeliveryPayload(fullAddress);
      const resolvedRestaurant = activeRestaurant || payloadRestaurantInfo || null;
      
      if (!resolvedRestaurant) {
        alert('Impossible de déterminer le restaurant pour cette commande.');
        setSubmitting(false);
        return;
      }

      // IMPORTANT: Réconcilier le panier avec les prix actuels du menu avant calcul (Dashboard = Paiement)
      let itemsToUse = savedCart.items;
      let menuItemsLatest = menuCatalogSnapshot;
      try {
        const menuRes = await fetch(`/api/restaurants/${resolvedRestaurant.id}/menu`, { cache: 'no-store' });
        if (menuRes.ok) {
          const menuItems = await menuRes.json();
          menuItemsLatest = Array.isArray(menuItems) ? menuItems : [];
          setMenuCatalogSnapshot(menuItemsLatest);
          const { items: reconciled } = reconcileCartWithMenu(savedCart.items, menuItemsLatest);
          itemsToUse = reconciled;
        }
      } catch (e) {
        console.warn('Réconciliation panier avant paiement:', e);
      }
      const panierContientAlcool = cartHasAlcohol(
        itemsToUse,
        Array.isArray(menuItemsLatest) ? menuItemsLatest : []
      );
      if (panierContientAlcool && !alcoholAttestationChecked) {
        alert(
          'Votre panier contient au moins un produit alcoolisé. Veuillez cocher la case de confirmation : vous certifiez être majeur(e) (18 ans révolus) conformément à la réglementation.'
        );
        setSubmitting(false);
        return;
      }

      const cartSubtotal = computeCartTotalWithExtras(itemsToUse);

      // Calculer la réduction (code promo + promo automatique ce soir)
      const tonightPromo = getTonightAutoPromo(cartSubtotal);
      const autoPromoDiscount = tonightPromo.eligible ? tonightPromo.discountEur : 0;
      const manualPromoDiscount = appliedPromoCode?.discountAmount || 0;
      const discountAmount = manualPromoDiscount + autoPromoDiscount;
      
      // Gérer la livraison gratuite si le code promo le prévoit (avant palier fidélité « livraison gratuite »)
      let finalDeliveryFeeForTotal = Math.round(parseFloat(finalDeliveryFee || fraisLivraison || 2.50) * 100) / 100;
      if (appliedPromoCode?.discountType === 'free_delivery') {
        finalDeliveryFeeForTotal = 0;
      }
      const PLATFORM_FEE = cvneatPlusPlatformFeeFreeLayer ? 0 : 0.49; // Offert pour abonnés éligibles CVN'EAT Plus

      const maxDiscount = Math.min(discountAmount, cartSubtotal);
      const maxServerDiscount = Math.min(manualPromoDiscount, cartSubtotal);
      const promoFree = appliedPromoCode?.discountType === 'free_delivery';
      const deliveryBeforeLoyalty = promoFree ? 0 : finalDeliveryFeeForTotal;

      const adj = computeLoyaltyAdjustments({
        rewardId: selectedLoyaltyRewardId,
        cartSubtotalEur: cartSubtotal,
        promoDiscountEur: maxDiscount,
        promoFreeDelivery: promoFree,
        deliveryFeeEur: deliveryBeforeLoyalty,
      });

      const subtotalAfterPromo = Math.max(0, cartSubtotal - maxDiscount);
      const subtotalAfterAllDiscounts = Math.max(
        0,
        Math.round((subtotalAfterPromo - adj.extraDiscountOnSubtotal) * 100) / 100
      );
      const platformPromoDiscount = computeSecondArticlePromoDiscountFromItems(itemsToUse, {
        capAt: subtotalAfterAllDiscounts,
      });
      const finalDeliveryFromLoyalty = adj.deliveryFeeEurAfter;
      const totalAmount = Math.max(
        0.5,
        Math.round(
          (subtotalAfterAllDiscounts - platformPromoDiscount + finalDeliveryFromLoyalty + PLATFORM_FEE) * 100
        ) / 100
      );

      if (
        selectedLoyaltyRewardId &&
        adj.pointsCost > 0 &&
        !adj.articleNote &&
        (adj.monetaryBenefitCustomerEur || 0) <= 0
      ) {
        alert(
          'Cette récompense ne s’applique pas à votre commande (ex. livraison déjà offerte ou montant insuffisant). Désélectionnez-la ou choisissez une autre option.'
        );
        setSubmitting(false);
        return;
      }
      
      // 3. Vérification finale de cohérence
      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.error('❌ ERREUR: Montant total invalide calculé:', {
          cartSubtotal,
          discountAmount,
          maxDiscount,
          subtotalAfterPromo,
          subtotalAfterAllDiscounts,
          platformPromoDiscount,
          finalDeliveryFromLoyalty,
          PLATFORM_FEE,
          totalAmount
        });
        throw new Error('Erreur de calcul du montant. Veuillez réessayer ou contacter le support.');
      }
      
      console.log('💰 Calcul montant final:', {
        cartSubtotal,
        discountAmount,
        maxDiscount,
        subtotalAfterPromo,
        subtotalAfterAllDiscounts,
        platformPromoDiscount,
        finalDeliveryFromLoyalty,
        PLATFORM_FEE,
        totalAmount
      });

      // Le code de sécurité est généré côté serveur dans l'API

      console.log('💰 Frais de livraison finaux:', {
        fraisLivraison,
        finalDeliveryFee,
        deliveryBeforeLoyalty,
        finalDeliveryFromLoyalty,
        'différence': Math.abs(deliveryBeforeLoyalty - (fraisLivraison || 0))
      });
      
      // SIMPLIFICATION: Créer la commande AVANT le paiement (statut "pending_payment")
      const customerFirstName = orderDetails.prenom?.trim() || '';
      const customerLastName = orderDetails.nom?.trim() || '';
      const customerPhone = orderDetails.telephone?.trim() || '';
      const customerEmail = orderDetails.email?.trim() || (user.email || '');

      console.log('📦 Création de la commande AVANT paiement...');
      
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Validation du code postal avant de créer la commande
      if (!selectedAddress.postal_code || selectedAddress.postal_code.trim() === '') {
        alert('Erreur: Le code postal est manquant. Veuillez vérifier votre adresse de livraison.');
        setSubmitting(false);
        return;
      }

      // Créer la commande en statut "pending_payment"
      const createOrderResponse = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          restaurantId: resolvedRestaurant.id,
          deliveryInfo: {
            address: selectedAddress.address || '',
            city: selectedAddress.city || '',
            postalCode: selectedAddress.postal_code || selectedAddress.postalCode || '',
            instructions: orderDetails.instructions?.trim() || ''
          },
          items: itemsToUse,
          // Frais après promo uniquement ; le serveur applique le palier « livraison gratuite » fidélité
          deliveryFee: deliveryBeforeLoyalty,
          totalAmount: cartSubtotal, // Sous-total articles (avant réduction)
          // On envoie la part "code promo"; la promo auto est appliquée côté serveur.
          discountAmount: maxServerDiscount,
          platformFee: PLATFORM_FEE,
          promoCodeId: appliedPromoCode?.promoCodeId || null,
          promoCode: appliedPromoCode?.code || null,
          loyaltyRewardId: selectedLoyaltyRewardId || null,
          alcoholLegalAgeDeclared: !panierContientAlcool || alcoholAttestationChecked === true,
          paymentStatus: 'pending', // Statut en attente de paiement (doit correspondre à la contrainte CHECK)
          customerInfo: {
            firstName: customerFirstName,
            lastName: customerLastName,
            phone: customerPhone,
            email: customerEmail
          }
        })
      });

      if (!createOrderResponse.ok) {
        const errorData = await createOrderResponse.json().catch(() => ({ error: 'Erreur lors de la création de la commande' }));
        throw new Error(errorData.error || 'Erreur lors de la création de la commande');
      }

      const orderResult = await createOrderResponse.json();
      const orderId = orderResult.orderId || orderResult.order?.id;
      const securityCode = orderResult.securityCode || orderResult.security_code || orderResult.order?.security_code;
      
      if (!orderId) {
        throw new Error('Commande créée mais identifiant introuvable');
      }

      console.log('✅ Commande créée:', orderId);
      
      // Stocker l'orderId et securityCode pour après le paiement
      setOrderData({
        orderId: orderId,
        securityCode: securityCode,
        restaurant_id: resolvedRestaurant.id,
        promoCode: appliedPromoCode,
        cartTotal: cartSubtotal,
        totalAmount: totalAmount,
        paymentTotal: totalAmount,
        loyaltyPointsCost: adj.pointsCost || 0,
        platformPromoDiscount,
      });

      // Créer le PaymentIntent Stripe avec l'ID de commande
      // Le montant a déjà été validé et ajusté ci-dessus (minimum 0.50€)
      // Double vérification de sécurité
      if (!totalAmount || totalAmount <= 0 || isNaN(totalAmount)) {
        console.error('❌ ERREUR CRITIQUE: Montant invalide après validation:', totalAmount);
        throw new Error('Erreur de calcul du montant. Veuillez réessayer ou contacter le support.');
      }

      if (totalAmount < 0.50) {
        console.error('❌ ERREUR CRITIQUE: Montant trop faible après validation:', totalAmount);
        throw new Error('Le montant minimum de commande est de 0.50€. Veuillez ajouter des articles à votre panier.');
      }

      console.log('💳 Création PaymentIntent Stripe pour montant:', totalAmount, '€');
      console.log('📊 Détails:', {
        cartTotal,
        discountAmount,
        subtotalAfterPromo,
        subtotalAfterAllDiscounts,
        deliveryBeforeLoyalty,
        finalDeliveryFromLoyalty,
        PLATFORM_FEE,
        totalAmount
      });

      const paymentResponse = await fetch('/api/payment/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: totalAmount,
          currency: 'eur',
          metadata: {
            order_id: orderId,
            user_id: user.id,
            restaurant_id: resolvedRestaurant.id,
            promo_code: appliedPromoCode?.code || null,
            loyalty_points_cost: String(adj.pointsCost || 0),
            platform_discount_amount: String(platformPromoDiscount || 0),
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
        
        // Message d'erreur plus clair pour l'utilisateur
        const errorMessage = errorData.error || `Erreur lors de la création du paiement (${paymentResponse.status})`;
        console.error('❌ Erreur création PaymentIntent:', {
          status: paymentResponse.status,
          error: errorMessage,
          totalAmount,
          cartTotal,
          discountAmount: appliedPromoCode?.discountAmount || 0,
          maxDiscount: typeof maxDiscount !== 'undefined' ? maxDiscount : 'non calculé',
          subtotalAfterPromo: typeof subtotalAfterPromo !== 'undefined' ? subtotalAfterPromo : 'non calculé',
          subtotalAfterAllDiscounts:
            typeof subtotalAfterAllDiscounts !== 'undefined'
              ? subtotalAfterAllDiscounts
              : 'non calculé',
          deliveryBeforeLoyalty:
            typeof deliveryBeforeLoyalty !== 'undefined' ? deliveryBeforeLoyalty : 'non calculé',
          finalDeliveryFromLoyalty:
            typeof finalDeliveryFromLoyalty !== 'undefined'
              ? finalDeliveryFromLoyalty
              : 'non calculé',
        });
        
        throw new Error(errorMessage);
      }

      const paymentData = await paymentResponse.json();
      setPaymentIntentId(paymentData.paymentIntentId);
      
      // Stocker le clientSecret pour le formulaire de paiement
      setClientSecret(paymentData.clientSecret);
      
      // Track Facebook Pixel - InitiateCheckout
      FacebookPixelEvents.initiateCheckout(cartTotal, cart);
      
      // Afficher le formulaire de paiement
      setShowPaymentForm(true);
      setSubmitting(false);
      
    } catch (error) {
      console.error('❌ Erreur préparation commande:', error);
      console.error('❌ Détails erreur:', {
        message: error.message,
        stack: error.stack,
        cartTotal,
        discountAmount: appliedPromoCode?.discountAmount,
        fraisLivraison,
        totalAmount: cartTotal - (appliedPromoCode?.discountAmount || 0) + fraisLivraison + 0.49
      });
      
      // Gestion spécifique de l'erreur 429
      if (error.message && (error.message.includes('429') || error.message.includes('Too Many Requests') || error.message.includes('Trop de requêtes'))) {
        alert('⚠️ Trop de requêtes ont été effectuées. Veuillez patienter quelques instants avant de réessayer.');
      } else if (error.message && error.message.includes('Montant')) {
        // Erreur liée au montant
        alert(`❌ ${error.message}\n\nVérifiez que votre panier contient des articles et que le code promo est valide.`);
      } else {
        // Message d'erreur générique mais plus informatif
        const userMessage = error.message || 'Erreur lors de la préparation de la commande';
        alert(`❌ ${userMessage}\n\nSi le problème persiste, contactez le support.`);
      }
      
      setSubmitting(false);
    }
  };

  // Fonction SIMPLIFIÉE : Mettre à jour la commande après paiement réussi
  const createOrderAfterPayment = async (confirmedPaymentIntentId) => {
    // Récupérer l'orderId depuis le state (stocké lors de la création)
    const orderId = orderData?.orderId;
    const securityCode = orderData?.securityCode;
    
    if (!orderId) {
      // Fallback: essayer de récupérer depuis le PaymentIntent metadata via l'API de confirmation
      console.warn('⚠️ OrderId non trouvé dans state, tentative via PaymentIntent metadata...');
      try {
        // L'API de confirmation a déjà mis à jour la commande via metadata
        // On peut juste rediriger vers la page de confirmation avec le paymentIntentId
        const confirmResponse = await fetch('/api/payment/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paymentIntentId: confirmedPaymentIntentId })
        });
        
        const confirmData = await confirmResponse.json();
        const fallbackOrderId = confirmData.orderId;
        
        if (fallbackOrderId) {
          // Nettoyer le panier
          safeLocalStorage.removeItem('cart');
          
          // Rediriger
          window.location.replace(`/order-confirmation/${fallbackOrderId}`);
          return confirmData;
        }
      } catch (error) {
        console.error('Erreur récupération orderId:', error);
      }
      
      throw new Error('ID de commande introuvable. Le paiement a été effectué, contactez le support avec votre numéro de transaction.');
    }

    // Mettre à jour la commande existante (simplifié)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    try {
      const updateResponse = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          stripe_payment_intent_id: confirmedPaymentIntentId,
          payment_status: 'paid',
          statut: 'en_attente'
        })
      });

      if (!updateResponse.ok) {
        console.warn('⚠️ Erreur mise à jour commande (non bloquant):', updateResponse.status);
        // Ne pas bloquer - le webhook Stripe gérera la mise à jour
      }
    } catch (updateError) {
      console.warn('⚠️ Erreur mise à jour commande (non bloquant):', updateError);
      // Ne pas bloquer - continuer vers la confirmation
    }

    // Enregistrer l'utilisation du code promo si présent
    if (orderData?.promoCode?.promoCodeId) {
      try {
        const promoApplyResponse = await fetch('/api/promo-codes/apply', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            promoCodeId: orderData.promoCode.promoCodeId,
            userId: user?.id || null,
            orderId: orderId,
            discountAmount: orderData.promoCode.discountAmount,
            orderAmount: orderData.cartTotal || 0
          })
        });
        
        if (!promoApplyResponse.ok) {
          console.warn('⚠️ Erreur enregistrement code promo (non bloquant):', promoApplyResponse.status);
        } else {
          console.log('✅ Utilisation du code promo enregistrée');
        }
      } catch (promoError) {
        console.warn('⚠️ Erreur enregistrement code promo (non bloquant):', promoError);
        // Ne pas bloquer le processus si l'enregistrement échoue
      }
    }

    // Nettoyer le panier
    safeLocalStorage.removeItem('cart');

    // Sauvegarder la dernière commande localement (pour permettre au client de la retrouver facilement)
    try {
      safeLocalStorage.setJSON('lastOrder', {
        orderId,
        securityCode: securityCode || null,
        savedAt: new Date().toISOString()
      });
    } catch {
      // ignore
    }

    // Rediriger vers la page de confirmation
    const redirectUrl = securityCode
      ? `/order-confirmation/${orderId}?code=${encodeURIComponent(securityCode)}`
      : `/order-confirmation/${orderId}`;
    
    window.location.replace(redirectUrl);
    
    return { orderId, securityCode };
  };

  // Gestionnaires pour le formulaire de paiement - SIMPLIFIÉ
  const handlePaymentSuccess = async (paymentData) => {
    try {
      console.log('✅ Paiement confirmé, mise à jour de la commande...');
      setSubmitting(true);
      
      // Mettre à jour la commande (simplifié - ne bloque pas si échec)
      await createOrderAfterPayment(paymentIntentId);
      
      setSubmitting(false);
    } catch (error) {
      console.error('❌ Erreur après paiement:', error);
      setSubmitting(false);
      
      // Message rassurant pour l'utilisateur
      const errorMessage = error.message || 'Erreur technique';
      alert(`✅ Paiement effectué avec succès !\n\n⚠️ ${errorMessage}\n\nVotre commande sera traitée automatiquement. Vous recevrez une confirmation par email.`);
      
      // Rediriger quand même vers la page de confirmation si on a l'orderId
      if (orderData?.orderId) {
        setTimeout(() => {
          window.location.replace(`/order-confirmation/${orderData.orderId}`);
        }, 2000);
      }
    }
  };

  const handlePaymentError = (error) => {
    console.error('❌ Erreur paiement:', error);
    const msg = String(error?.message || error || '');
    let friendly = 'Une erreur est survenue lors du paiement. ';
    if (msg.toLowerCase().includes('card') || msg.toLowerCase().includes('carte')) {
      friendly += 'Vérifiez les informations de votre carte (numéro, date, CVC).';
    } else if (msg.toLowerCase().includes('declined') || msg.toLowerCase().includes('refus')) {
      friendly += 'Votre banque a refusé le paiement. Essayez une autre carte ou contactez votre banque.';
    } else if (msg.toLowerCase().includes('insufficient') || msg.toLowerCase().includes('solde')) {
      friendly += 'Solde insuffisant. Utilisez une autre carte ou moyen de paiement.';
    } else if (msg.toLowerCase().includes('network') || msg.toLowerCase().includes('fetch')) {
      friendly += 'Problème de connexion. Vérifiez votre internet et réessayez.';
    } else {
      friendly += msg ? `Détails : ${msg}` : 'Réessayez ou contactez le support (07 86 01 41 71).';
    }
    alert(friendly);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Bannière Livraison Offerte */}
      {/* PROMO TERMINÉE : Bannière de livraison gratuite retirée */}
      {/* <FreeDeliveryBanner /> */}
      
      <div className="py-2 fold:py-2 xs:py-4 sm:py-8">
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

        {/* Bannière de fermeture globale des commandes */}
        {!ordersOpen && (
          <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <FaMotorcycle className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">⚠️ Maintenance en cours</h2>
                <p className="text-sm opacity-95">Les commandes sont temporairement indisponibles. Merci de réessayer plus tard.</p>
              </div>
            </div>
          </div>
        )}

        {deliveryNotice && (
          <div className="mb-4 sm:mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-900 dark:text-amber-100 rounded-lg">
            <h2 className="font-semibold mb-1">Information livraison</h2>
            <p className="text-sm">{deliveryNotice}</p>
          </div>
        )}

        {/* Bannière de fermeture des livraisons - Météo (manuel) */}
        {deliveryClosed && (
          <div className="mb-4 sm:mb-6 p-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg shadow-lg">
            <div className="flex items-center gap-3">
              <FaCloudRain className="h-6 w-6 flex-shrink-0" />
              <div className="flex-1">
                <h2 className="font-bold text-lg mb-1">⚠️ Livraisons fermées ce soir</h2>
                <p className="text-sm opacity-95">{deliveryClosedMessage}</p>
              </div>
            </div>
          </div>
        )}

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
              {cart.map((item, index) => (
                <div key={`${item.id}-${index}`} className="border-b border-gray-100 dark:border-gray-700 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">{item.nom}</p>
                        {item.is_formula && (
                          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">
                            Formule
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mb-1">Quantité: {item.quantity}</p>
                      
                      {/* Détails de la formule */}
                      {item.is_formula && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5 mt-1">
                          {/* Boisson */}
                          {item.selected_drink && (
                            <div className="text-blue-600 dark:text-blue-400">
                              <span className="font-medium">🥤 Boisson:</span> {item.selected_drink.nom}
                            </div>
                          )}
                          
                          {/* Customizations */}
                          {item.customizations && (
                            <>
                              {/* Viandes */}
                              {item.customizations.selectedMeats && item.customizations.selectedMeats.length > 0 && (
                                <div>
                                  <span className="font-medium">🥩 Viande(s):</span> {item.customizations.selectedMeats.map(m => m.nom || m.name).join(', ')}
                                </div>
                              )}
                              
                              {/* Sauces */}
                              {item.customizations.selectedSauces && item.customizations.selectedSauces.length > 0 && (
                                <div>
                                  <span className="font-medium">🍯 Sauce(s):</span> {item.customizations.selectedSauces.map(s => s.nom || s.name).join(', ')}
                                </div>
                              )}
                              
                              {/* Ingrédients retirés */}
                              {item.customizations.removedIngredients && item.customizations.removedIngredients.length > 0 && (
                                <div className="text-red-600 dark:text-red-400">
                                  <span className="font-medium">🚫 Sans:</span> {item.customizations.removedIngredients.map(ing => ing.nom || ing.name || ing).join(', ')}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Suppléments */}
                      {item.supplements && item.supplements.length > 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span className="font-medium">Suppléments:</span> {item.supplements.map(s => s.nom || s.name).join(', ')}
                        </div>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base ml-2 flex-shrink-0">
                      {getItemLineTotal(item).toFixed(2)}€
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {(() => {
              const { adj, PLATFORM_FEE, totalToPay, rewardMeta, maxDiscount, platformPromoDiscount } = loyaltyCheckout;
              const displayedDeliveryFee = adj.deliveryFeeEurAfter;
              return (
            <div className="border-t dark:border-gray-700 pt-3 sm:pt-4 space-y-2 sm:space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span>Sous-total</span>
                <span className="font-semibold">{cartTotal.toFixed(2)}€</span>
              </div>
              {appliedPromoCode && maxDiscount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400 text-sm sm:text-base">
                  <span>Réduction ({appliedPromoCode.code})</span>
                  <span className="font-semibold">-{maxDiscount.toFixed(2)}€</span>
                </div>
              )}
              {adj.pointsCost > 0 && rewardMeta && (
                <>
                  {rewardMeta.redemption?.type === 'subtotal_discount' && adj.extraDiscountOnSubtotal > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                      <span className="flex items-center">
                        <FaGift className="h-3 w-3 mr-1" />
                        Fidélité — {rewardMeta.name} (−{adj.pointsCost} pts)
                      </span>
                      <span className="font-semibold">-{adj.extraDiscountOnSubtotal.toFixed(2)}€</span>
                    </div>
                  )}
                  {rewardMeta.redemption?.type === 'free_delivery' &&
                    loyaltyCheckout.deliveryBeforeLoyalty > 0 &&
                    displayedDeliveryFee === 0 &&
                    !loyaltyCheckout.promoFree && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 text-sm sm:text-base">
                        <span className="flex items-center">
                          <FaGift className="h-3 w-3 mr-1" />
                          Fidélité — {rewardMeta.name} (−{adj.pointsCost} pts)
                        </span>
                        <span className="font-semibold">Livraison offerte</span>
                      </div>
                    )}
                  {rewardMeta.redemption?.type === 'free_delivery' &&
                    (loyaltyCheckout.promoFree || loyaltyCheckout.deliveryBeforeLoyalty <= 0) && (
                      <div className="flex justify-between text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                        <span className="flex items-center">
                          <FaGift className="h-3 w-3 mr-1 shrink-0" />
                          Fidélité — {rewardMeta.name} (−{adj.pointsCost} pts)
                        </span>
                        <span className="font-semibold text-right max-w-[58%]">
                          Livraison déjà offerte : aucune réduction supplémentaire sur cette commande
                        </span>
                      </div>
                    )}
                  {rewardMeta.redemption?.type === 'article_note' && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400 text-xs sm:text-sm">
                      <span className="flex items-center">
                        <FaGift className="h-3 w-3 mr-1 shrink-0" />
                        Fidélité — {rewardMeta.name} (−{adj.pointsCost} pts)
                      </span>
                      <span className="font-semibold text-right max-w-[58%]">
                        Dessert ou boisson offert (voir note adresse)
                      </span>
                    </div>
                  )}
                </>
              )}
              {platformPromoDiscount > 0 && (
                <div className="flex justify-between text-blue-600 dark:text-blue-300 text-sm sm:text-base">
                  <span className="flex items-center">
                    <FaTag className="h-3 w-3 mr-1" />
                    {SECOND_ARTICLE_PROMO_CHECKOUT_LINE}
                  </span>
                  <span className="font-semibold">-{platformPromoDiscount.toFixed(2)}€</span>
                </div>
              )}
              <div key={`frais-${forceUpdate}`} className="flex justify-between text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                <span className="flex items-center">
                  <FaMotorcycle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                  Frais de livraison
                </span>
                <span className="font-semibold">
                  {displayedDeliveryFee.toFixed(2)}€
                </span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-300 text-xs sm:text-sm">
                <span>Frais plateforme</span>
                <span className="font-semibold">{PLATFORM_FEE.toFixed(2)}€</span>
              </div>
              <div key={`total-${forceUpdate}`} className="border-t dark:border-gray-700 pt-2 sm:pt-3">
                <div className="flex justify-between text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400">
                  <span>Total</span>
                  <span>{totalToPay.toFixed(2)}€</span>
                </div>
              </div>
            </div>
              );
            })()}

            {/* Bloc CVN'EAT Plus (déplacé ici pour ne pas casser la home) */}
            <div className="border-t dark:border-gray-700 pt-4 mt-4 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/70 dark:bg-emerald-950/20 p-3">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                {CVNEAT_PLUS_NAME}
              </p>
              <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90 mt-1 leading-relaxed">
                -50% sur la livraison + frais plateforme offerts dès {CVNEAT_PLUS_MIN_ORDER_EUR}€ d’articles.
              </p>
              {cvneatPlus.active && (
                <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                  Avantage actif sur cette commande.
                </p>
              )}
              {!cvneatPlus.active && (
                <a href="/abonnement" className="inline-block mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline">
                  Voir l’abonnement
                </a>
              )}
            </div>

            {/* Utiliser mes points de fidélité */}
            {userPoints > 0 && (
              <div className="border-t dark:border-gray-700 pt-4 mt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center text-sm sm:text-base">
                  <FaGift className="h-4 w-4 text-amber-500 dark:text-amber-400 mr-2" />
                  Utiliser mes points ({userPoints} pts)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">{LOYALTY_CHECKOUT_HELP}</p>
                <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2">Récompenses (paliers)</p>
                <div className="flex gap-2 flex-wrap mb-1">
                  {LOYALTY_REWARDS_CATALOG.filter((r) => r.available !== false && r.cost <= userPoints).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() =>
                        setSelectedLoyaltyRewardId((prev) => (prev === r.id ? null : r.id))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedLoyaltyRewardId === r.id
                          ? 'bg-amber-500 text-white'
                          : 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                      }`}
                    >
                      {r.name} ({r.cost} pts)
                    </button>
                  ))}
                  {selectedLoyaltyRewardId && (
                    <button
                      type="button"
                      onClick={() => setSelectedLoyaltyRewardId(null)}
                      className="px-3 py-1.5 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:underline"
                    >
                      Annuler la récompense
                    </button>
                  )}
                </div>
              </div>
            )}

            {cartContainsAlcohol && (
              <div className="border-t dark:border-gray-700 pt-4 mt-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/30 p-4">
                <h3 className="font-medium text-amber-900 dark:text-amber-100 mb-2 text-sm sm:text-base">
                  Vente d&apos;alcool — vérification d&apos;âge
                </h3>
                <p className="text-xs text-amber-900/90 dark:text-amber-100/90 mb-3 leading-relaxed">
                  Votre panier contient au moins un article marqué comme alcoolisé par le restaurant. La vente est réservée aux
                  personnes majeures. En commandant, vous reconnaissez que la vérification d&apos;identité peut être exigée à la
                  livraison. CVN&apos;EAT ne contrôle pas l&apos;âge réel : vous déclarez seul(e) être autorisé(e) à acheter ces
                  produits.
                </p>
                <label className="flex items-start gap-2 cursor-pointer text-sm text-amber-950 dark:text-amber-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                    checked={alcoholAttestationChecked}
                    onChange={(e) => setAlcoholAttestationChecked(e.target.checked)}
                  />
                  <span>
                    Je certifie sur l&apos;honneur avoir <strong>18 ans révolus</strong> à la date de la commande et être légalement
                    autorisé(e) à acheter de l&apos;alcool en France. Je comprends que de fausses déclarations peuvent engager ma
                    responsabilité.
                  </span>
                </label>
              </div>
            )}

            {/* Code promo */}
            <div className="border-t dark:border-gray-700 pt-4 sm:pt-4 mt-4 sm:mt-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-3 sm:mb-3 flex items-center text-sm sm:text-base">
                <FaTag className="h-4 w-4 text-blue-600 dark:text-blue-400 mr-2" />
                Code promo
              </h3>
              {loyaltyCheckout.tonightPromoEligible && (
                <div className="mb-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 px-3 py-2">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300">
                    🔥 Promo ce soir appliquée automatiquement: -{loyaltyCheckout.autoPromoDiscount.toFixed(2)}EUR dès 30EUR d&apos;achat.
                  </p>
                </div>
              )}
              <PromoCodeInput
                onCodeApplied={(codeData) => {
                  setAppliedPromoCode(codeData);
                }}
                appliedCode={appliedPromoCode}
                cartTotal={cartTotal}
                restaurantId={restaurant?.id || restaurant?.restaurant_id || null}
                userId={user?.id}
                isFirstOrder={false}
              />
            </div>

            {/* Message de fermeture globale des commandes */}
            {!ordersOpen && (
              <div className="mt-4 sm:mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaMotorcycle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                      Maintenance en cours
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Les commandes sont temporairement indisponibles. Merci de réessayer plus tard.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Message de fermeture des livraisons - Météo (manuel) */}
            {deliveryClosed && (
              <div className="mt-4 sm:mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <FaCloudRain className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                      Livraisons fermées ce soir
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      {deliveryClosedMessage}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!showPaymentForm ? (
              <>
                <button
                  onClick={submitOrder}
                  disabled={
                    submitting ||
                    !selectedAddress ||
                    deliveryError !== null ||
                    deliveryClosed ||
                    !ordersOpen ||
                    (cartContainsAlcohol && !alcoholAttestationChecked)
                  }
                  className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed mt-4 sm:mt-6 min-h-[44px] touch-manipulation"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white mr-2"></div>
                      Préparation...
                    </div>
                  ) : (
                    `Payer ${loyaltyCheckout.totalToPay.toFixed(2)}€`
                  )}
                </button>
                {(submitting ||
                  !selectedAddress ||
                  deliveryError !== null ||
                  deliveryClosed ||
                  !ordersOpen ||
                  (cartContainsAlcohol && !alcoholAttestationChecked)) &&
                  !submitting && (
                  <p className="text-center text-sm text-amber-600 dark:text-amber-400 mt-2">
                    {!selectedAddress && 'Sélectionnez une adresse de livraison pour continuer.'}
                    {selectedAddress && deliveryError !== null && 'Vérifiez l\'adresse de livraison.'}
                    {selectedAddress && deliveryError === null && deliveryClosed && 'Les livraisons sont fermées pour ce créneau.'}
                    {selectedAddress && deliveryError === null && !deliveryClosed && !ordersOpen && 'Le restaurant n\'accepte pas les commandes pour le moment.'}
                    {selectedAddress &&
                      deliveryError === null &&
                      !deliveryClosed &&
                      ordersOpen &&
                      cartContainsAlcohol &&
                      !alcoholAttestationChecked &&
                      'Cochez la confirmation sur l’âge pour les produits alcoolisés.'}
                  </p>
                )}
              </>
            ) : (
              <div className="mt-4 sm:mt-6">
                {/* Récapitulatif final avant paiement */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center">
                    <FaCheck className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                    Récapitulatif de votre commande
                  </h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-600 dark:text-gray-400">Restaurant :</span> <strong>{restaurant?.nom || '—'}</strong></p>
                    <p><span className="text-gray-600 dark:text-gray-400">Articles :</span> {cart.length} article{cart.length > 1 ? 's' : ''}</p>
                    <p><span className="text-gray-600 dark:text-gray-400">Adresse :</span> {selectedAddress ? `${selectedAddress.address}, ${selectedAddress.postal_code} ${selectedAddress.city}` : '—'}</p>
                    <p className="pt-2 border-t border-blue-200 dark:border-blue-800">
                      <span className="text-gray-600 dark:text-gray-400">Total à payer :</span>{' '}
                      <strong className="text-lg text-blue-600 dark:text-blue-400">
                        {`${(orderData?.paymentTotal ?? loyaltyCheckout.totalToPay).toFixed(2)}€`}
                      </strong>
                    </p>
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                  <FaCreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  Paiement sécurisé
                </h3>
                {clientSecret && (
                  <PaymentForm
                    amount={orderData?.paymentTotal ?? loyaltyCheckout.totalToPay}
                    paymentIntentId={paymentIntentId}
                    clientSecret={clientSecret}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    discount={0}
                    platformFee={(orderData?.platform_fee) ?? 0.49}
                  />
                )}
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentIntentId(null);
                    setClientSecret(null);
                    setOrderData(null);
                    setSelectedLoyaltyRewardId(null);
                  }}
                  className="w-full mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 text-sm sm:text-base"
                >
                  Annuler et retourner
                </button>
              </div>
            )}
            <SupportContactBlock className="mt-4" />
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
    </div>
  );
}
