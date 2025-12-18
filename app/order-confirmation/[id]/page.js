'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FacebookPixelEvents } from '@/components/FacebookPixel';
import LuckyWheel from '@/components/LuckyWheel';
import { 
  FaCheck, 
  FaClock, 
  FaUtensils, 
  FaMotorcycle, 
  FaHome,
  FaMapMarkerAlt,
  FaPhone,
  FaStar,
  FaHeart,
  FaShare,
  FaDownload,
  FaArrowLeft,
  FaTruck,
  FaUser,
  FaCreditCard
} from 'react-icons/fa';

export default function OrderConfirmation() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [securityCode, setSecurityCode] = useState(null);
  const [authToken, setAuthToken] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const loadSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (isMounted) {
          setAuthToken(session?.access_token || null);
          setUserId(session?.user?.id || null);
        }
      } catch (e) {
        console.warn('Impossible de récupérer la session Supabase:', e);
      }
    };

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token || null);
      setUserId(session?.user?.id || null);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    const codeFromUrl = searchParams?.get?.('code');
    if (codeFromUrl && codeFromUrl !== securityCode) {
      setSecurityCode(codeFromUrl);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(`order-code-${id}`, codeFromUrl);
        } catch (e) {
          console.warn('Impossible de stocker le code commande en session:', e);
        }
      }
      return;
    }

    if (!codeFromUrl && typeof window !== 'undefined') {
      try {
        const storedCode = sessionStorage.getItem(`order-code-${id}`);
        if (storedCode && storedCode !== securityCode) {
          setSecurityCode(storedCode);
        }
      } catch (e) {
        console.warn('Impossible de récupérer le code commande en session:', e);
      }
    }
  }, [id, searchParams, securityCode]);

  useEffect(() => {
    if (!id) return;
    if (!authToken && !securityCode) return;

    let isMounted = true;
    let firstFetch = true;

    const loadOrder = async () => {
      try {
        if (firstFetch) {
          setLoading(true);
        }

        const headers = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }
        const query = securityCode ? `?code=${encodeURIComponent(securityCode)}` : '';
        const response = await fetch(`/api/orders/${id}${query}`, { headers });

        if (!response.ok) {
          let message = 'Commande non trouvée';
          if (response.status === 401) {
            message = 'Accès non autorisé. Connectez-vous ou utilisez le lien sécurisé.';
          } else if (response.status === 403) {
            message = 'Vous n’êtes pas autorisé à consulter cette commande.';
          } else if (response.status >= 500) {
            message = 'Erreur serveur. Veuillez réessayer.';
          }
          throw new Error(message);
        }

        const data = await response.json();
        if (!isMounted) return;
        
        // Vérifier si le paiement a échoué ou a été remboursé
        if (data.payment_status === 'failed' || data.payment_status === 'canceled' || data.payment_status === 'refunded' ||
            (data.statut === 'annulee' && data.payment_status !== 'paid' && data.payment_status !== 'succeeded')) {
          
          if (data.payment_status === 'refunded') {
            setError('Cette commande a été annulée et remboursée intégralement. Le montant sera visible sur votre compte dans 2-5 jours.');
          } else {
            setError('Le paiement de cette commande a échoué. Veuillez retourner au panier pour réessayer.');
          }
          setLoading(false);
          return;
        }
        
        setOrderData(data);
        setError(null);
        setLoading(false);
        
        // Afficher la roulette si le paiement est réussi ou si un paiement a été initié
        // Conditions: payment_status = 'paid'/'succeeded' OU stripe_payment_intent_id existe (paiement initié)
        // OU si la commande n'est pas annulée et a un statut valide (en_attente, acceptee, etc.)
        const hasPaid = data && (
          data.payment_status === 'paid' || 
          data.payment_status === 'succeeded' ||
          (data.stripe_payment_intent_id && data.statut !== 'annulee') ||
          // Si la commande existe et n'est pas annulée, considérer qu'elle est payée (le webhook peut prendre du temps)
          (data.statut && data.statut !== 'annulee' && data.id)
        );
        
        console.log('🎰 Vérification roue de la chance:', {
          hasPaid,
          userId,
          payment_status: data?.payment_status,
          stripe_payment_intent_id: data?.stripe_payment_intent_id,
          statut: data?.statut,
          orderId: data?.id
        });
        
        if (hasPaid && userId) {
          // Vérifier si l'utilisateur a déjà joué pour cette commande
          if (typeof window !== 'undefined') {
            const played = JSON.parse(localStorage.getItem('luckyWheelPlayed') || '[]');
            const alreadyPlayed = played.includes(data.id);
            console.log('🎰 Déjà joué pour cette commande?', alreadyPlayed, 'Commandes jouées:', played);
            
            if (!alreadyPlayed) {
              // Afficher la roulette après un court délai pour laisser la page se charger
              console.log('✅ Affichage de la roue de la chance dans 1.5s...');
              setTimeout(() => {
                setShowLuckyWheel(true);
              }, 1500);
            } else {
              console.log('⚠️ Roue déjà jouée pour cette commande');
            }
          }
        } else {
          console.log('⚠️ Conditions non remplies pour la roue:', { hasPaid, userId });
        }
        
        // Track Facebook Pixel - Purchase (une seule fois par commande)
        if (data && !data._pixelTracked) {
          // Marquer comme tracké pour éviter les doublons
          data._pixelTracked = true;
          FacebookPixelEvents.purchase({
            id: data.id,
            total: data.total || data.montant_total || 0,
            items: data.items || data.details_commande || []
          });
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Commande non trouvée');
        setLoading(false);
      } finally {
        firstFetch = false;
      }
    };

    setTimeElapsed(0);
    loadOrder();
    const fetchInterval = setInterval(loadOrder, 3000);
    const timerInterval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      isMounted = false;
      clearInterval(fetchInterval);
      clearInterval(timerInterval);
    };
  }, [id, authToken, securityCode, userId]); // Ajouter userId aux dépendances

  // Helper pour obtenir le statut (normaliser statut/status)
  const getStatus = () => {
    return orderData?.statut || orderData?.status;
  };

  const getDeliveryFee = () => {
    // IMPORTANT: Utiliser frais_livraison en priorité (nom de colonne BDD)
    return Number(orderData?.frais_livraison ?? orderData?.deliveryFee ?? orderData?.delivery_fee ?? 0);
  };

  const getSubtotal = () => {
    if (typeof orderData?.subtotal === 'number') return orderData.subtotal;
    if (typeof orderData?.subtotal_amount === 'number') return orderData.subtotal_amount;
    if (typeof orderData?.total_without_delivery === 'number') return orderData.total_without_delivery;
    const totalAmount = getTotalAmount();
    return Math.max(totalAmount - getDeliveryFee(), 0);
  };

  const getTotalAmount = () => {
    if (typeof orderData?.total === 'number') return orderData.total;
    if (typeof orderData?.total_amount === 'number') return orderData.total_amount;
    if (typeof orderData?.total_with_delivery === 'number') return orderData.total_with_delivery;
    return Number(orderData?.totalAmount ?? 0);
  };

  const getSecurityCode = () => {
    return securityCode || orderData?.security_code || orderData?.delivery_code || null;
  };

  const getStatusText = (statut) => {
    const status = statut || getStatus();
    switch (status) {
      case 'en_attente':
      case 'pending':
        return 'En attente d\'acceptation';
      case 'acceptee':
      case 'accepted':
        return 'Commande acceptée';
      case 'refusee':
      case 'rejected':
        return 'Commande refusée';
      case 'en_preparation':
      case 'preparing':
        return 'En cours de préparation';
      case 'pret_a_livrer':
      case 'ready':
        return 'Prête pour la livraison';
      case 'en_livraison':
        return 'En cours de livraison';
      case 'livree':
      case 'delivered':
        return 'Livrée';
      case 'annulee':
      case 'cancelled':
        return 'Annulée';
      default:
        return status || 'Inconnu';
    }
  };

  const getStatusIcon = (statut) => {
    const status = statut || getStatus();
    switch (status) {
      case 'en_attente':
      case 'pending':
        return <FaClock className="h-5 w-5" />;
      case 'acceptee':
      case 'accepted':
        return <FaCheck className="h-5 w-5" />;
      case 'refusee':
      case 'rejected':
        return <FaCheck className="h-5 w-5" />;
      case 'en_preparation':
      case 'preparing':
        return <FaUtensils className="h-5 w-5" />;
      case 'pret_a_livrer':
      case 'ready':
        return <FaMotorcycle className="h-5 w-5" />;
      case 'en_livraison':
        return <FaTruck className="h-5 w-5" />;
      case 'livree':
      case 'delivered':
        return <FaHome className="h-5 w-5" />;
      default:
        return <FaClock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (statut) => {
    const status = statut || getStatus();
    switch (status) {
      case 'en_attente':
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'acceptee':
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'refusee':
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'en_preparation':
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pret_a_livrer':
      case 'ready':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'en_livraison':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'livree':
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstimatedTime = () => {
    if (!orderData) return 30;
    const status = getStatus();
    switch (status) {
      case 'en_attente':
      case 'pending':
        return 35;
      case 'acceptee':
      case 'accepted':
        return 30;
      case 'en_preparation':
      case 'preparing':
        return 20;
      case 'pret_a_livrer':
      case 'ready':
        return 10;
      default:
        return 0;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadReceipt = () => {
    if (!orderData) return;
    
    const receipt = `
      RECU DE COMMANDE
      =================
      
      Commande #${orderData.id}
      Date: ${new Date(orderData.created_at).toLocaleString('fr-FR')}
      
      Restaurant: ${orderData.restaurants?.name || 'N/A'}
      
      ARTICLES:
      ${orderData.items?.map(item => 
        `${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€`
      ).join('\n')}
      
      Sous-total: ${getSubtotal().toFixed(2)}€
      Frais de livraison: ${getDeliveryFee().toFixed(2)}€
      TOTAL: ${getTotalAmount().toFixed(2)}€
      
      Livraison: ${orderData.delivery_address}, ${orderData.delivery_city} ${orderData.delivery_postal_code}
      
      Merci pour votre commande !
    `;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commande-${orderData.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ma commande CVNeat',
        text: `J'ai commandé chez ${orderData.restaurants?.name} ! Commande #${orderData.id}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers !');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              {error?.includes('remboursée') ? (
                <FaCreditCard className="h-12 w-12 text-red-500" />
              ) : (
                <FaCheck className="h-12 w-12 text-red-500" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error?.includes('remboursée') ? 'Commande Remboursée' : 'Commande non trouvée'}
            </h1>
            <p className="text-gray-600 mb-6">{error || 'Impossible de récupérer les détails de votre commande.'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suivi de commande</h1>
                <p className="text-sm text-gray-600">Commande #{orderData.id}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={shareOrder}
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title="Partager"
              >
                <FaShare className="h-4 w-4" />
              </button>
              <button
                onClick={downloadReceipt}
                className="text-gray-600 hover:text-green-600 transition-colors p-2"
                title="Télécharger le reçu"
              >
                <FaDownload className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Confirmation */}
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCheck className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Commande confirmée !</h1>
              <p className="text-gray-600 mb-6">
                Votre commande #{orderData.id} a été reçue et est en cours de traitement.
              </p>
              
              {/* Statut de la commande */}
              <div className={`inline-flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-semibold border ${getStatusColor()}`}>
                {getStatusIcon()}
                <span>{getStatusText()}</span>
              </div>
            </div>

            {/* Suivi en temps réel */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Suivi en temps réel</h2>
              
              <div className="space-y-6">
                {/* Temps écoulé */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FaClock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Temps écoulé</p>
                      <p className="text-sm text-blue-700">{formatTime(timeElapsed)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-900">Temps estimé</p>
                    <p className="text-sm text-blue-700">{getEstimatedTime()} min</p>
                  </div>
                </div>

                {/* Étapes de la commande */}
                <div className="space-y-4">
                  {[
                    { status: 'en_attente', label: 'Commande reçue', icon: FaCheck },
                    { status: 'acceptee', label: 'Restaurant accepte', icon: FaUtensils },
                    { status: 'en_preparation', label: 'En préparation', icon: FaUtensils },
                    { status: 'pret_a_livrer', label: 'Prêt pour livraison', icon: FaMotorcycle },
                    { status: 'livree', label: 'Livré', icon: FaHome }
                  ].map((step, index) => {
                    const currentStatus = getStatus();
                    const statusMap = {
                      'en_attente': 0, 'pending': 0,
                      'acceptee': 1, 'accepted': 1,
                      'en_preparation': 2, 'preparing': 2,
                      'pret_a_livrer': 3, 'ready': 3,
                      'en_livraison': 4,
                      'livree': 5, 'delivered': 5
                    };
                    const stepIndex = statusMap[step.status] || 0;
                    const currentIndex = statusMap[currentStatus] || 0;
                    const isActive = currentStatus === step.status || 
                                   (step.status === 'en_attente' && (currentStatus === 'pending' || currentStatus === 'en_attente')) ||
                                   (step.status === 'acceptee' && (currentStatus === 'accepted' || currentStatus === 'acceptee')) ||
                                   (step.status === 'en_preparation' && (currentStatus === 'preparing' || currentStatus === 'en_preparation')) ||
                                   (step.status === 'pret_a_livrer' && (currentStatus === 'ready' || currentStatus === 'pret_a_livrer'));
                    const isCompleted = currentIndex > stepIndex;
                    
                    return (
                      <div key={step.status} className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-100 text-green-600' : 
                          isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCompleted ? <FaCheck className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {isActive && (
                            <p className="text-sm text-gray-500">En cours...</p>
              )}
            </div>
          </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Détails de la commande */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Détails de la commande</h2>
              
              <div className="space-y-6">
                {/* Restaurant */}
                {orderData.restaurants && (
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUtensils className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{orderData.restaurants.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{orderData.restaurants.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaStar className="h-3 w-3 text-yellow-400 mr-1" />
                          <span>{orderData.restaurants.rating || '4.5'}</span>
                        </div>
                        <div className="flex items-center">
                          <FaClock className="h-3 w-3 mr-1" />
                          <span>{orderData.restaurants.deliveryTime || 30} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Articles */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Articles commandés</h3>
                  <div className="space-y-3">
              {orderData.items && orderData.items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {item.name}
                              {item.isCombo && <span className="ml-2 text-purple-600">🍔 Menu</span>}
                            </p>
                            <p className="text-sm text-gray-600">x{item.quantity}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                        </div>
                        {/* Détails du combo */}
                        {item.isCombo && item.comboDetails && item.comboDetails.length > 0 && (
                          <div className="mt-2 ml-2 text-sm text-gray-600 space-y-1">
                            {item.comboDetails.map((detail, idx) => (
                              <div key={idx}>• {detail.stepTitle}: <strong>{detail.optionName}</strong></div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totaux */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total</span>
                    <span>{getSubtotal().toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Frais de livraison</span>
                    <span>{getDeliveryFee().toFixed(2)}€</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">{getTotalAmount().toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Informations de livraison */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de livraison</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <FaUser className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.customer_name}</p>
                      <p className="text-sm text-gray-600">Client</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <FaPhone className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.customer_phone}</p>
                      <p className="text-sm text-gray-600">Téléphone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <FaMapMarkerAlt className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.delivery_address}</p>
                      <p className="text-sm text-gray-600">
                        {orderData.delivery_city} {orderData.delivery_postal_code}
                      </p>
                    </div>
                  </div>
                  
                  {orderData.delivery_instructions && (
                    <div className="flex items-start space-x-3">
                      <FaTruck className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Instructions</p>
                        <p className="text-sm text-gray-600">{orderData.delivery_instructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Code de sécurité pour la livraison */}
              {getSecurityCode() && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Code de sécurité</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Communiquez ce code à votre livreur lors de la remise de la commande.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-lg px-4 py-3 text-center text-2xl font-bold tracking-widest">
                    {getSecurityCode()}
                  </div>
                </div>
              )}

              {/* Actions rapides */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                
                <div className="space-y-3">
                  {/* Bouton de suivi GPS en temps réel */}
                  {(() => {
                    const status = getStatus();
                    return status && ['acceptee', 'accepted', 'en_preparation', 'preparing', 'pret_a_livrer', 'ready', 'en_livraison'].includes(status);
                  })() && (
                    <button
                      onClick={() => router.push(`/track/${id}`)}
                      className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-3 px-4 rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 transform hover:scale-105 font-semibold flex items-center justify-center space-x-2"
                    >
                      <FaMapMarkerAlt />
                      <span>Suivre en temps réel 🗺️</span>
                    </button>
                  )}

                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold"
                  >
                    Commander à nouveau
                  </button>
                  
                  <button
                    onClick={downloadReceipt}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Télécharger le reçu
                  </button>
                  
                  <button
                    onClick={shareOrder}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Partager ma commande
                  </button>
                </div>
              </div>

              {/* Support */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Notre équipe est là pour vous aider avec votre commande.
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Contacter le support
            </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Roue de la chance */}
      {showLuckyWheel && userId && (
        <LuckyWheel
          isOpen={showLuckyWheel}
          onClose={() => setShowLuckyWheel(false)}
          onWin={(prize) => {
            console.log('🎉 Gain obtenu:', prize);
            setShowLuckyWheel(false);
          }}
          orderId={id}
          userId={userId}
        />
      )}
    </div>
  );
} 