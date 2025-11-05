'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import { supabase } from '../../lib/supabase';

export default function TrackOrder() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [lastStatus, setLastStatus] = useState(null);

  const fetchOrder = async () => {
    if (!orderId.trim()) {
      setError('Veuillez entrer un numéro de commande');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Vérifier si l'utilisateur est connecté
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setError('Vous devez être connecté pour suivre une commande. Veuillez vous connecter d\'abord.');
        setLoading(false);
        return;
      }

      console.log('🔑 Session trouvée:', !!session);
      console.log('👤 Token:', session.access_token ? 'Présent' : 'Manquant');

      // Récupérer les informations de l'utilisateur
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('❌ Erreur utilisateur:', userError);
        setError('Erreur d\'authentification. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }

      console.log('✅ Utilisateur connecté:', user.email);
      
      // Récupérer la commande avec vérification d'appartenance
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Réponse API:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Erreur API:', errorData);
        
        if (response.status === 404) {
          throw new Error('Commande non trouvée');
        } else if (response.status === 403) {
          throw new Error('Vous n\'êtes pas autorisé à voir cette commande. Vérifiez que le nom de la commande correspond à votre nom d\'utilisateur.');
        } else if (response.status === 401) {
          throw new Error('Session expirée. Veuillez vous reconnecter.');
        } else {
          throw new Error(`Erreur serveur (${response.status}): ${errorData.error || 'Erreur inconnue'}`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Commande récupérée:', data);
      
      setOrder(data);
      // Utiliser statut (français) avec fallback sur status (anglais) pour compatibilité
      setLastStatus(data.statut || data.status);
      
      // Simuler des notifications basées sur le statut
      generateNotifications(data);
      
      // Démarrer le suivi automatique si la commande n'est pas livrée
      const currentStatut = data.statut || data.status;
      if (currentStatut !== 'livree' && currentStatut !== 'annulee' && currentStatut !== 'delivered' && currentStatut !== 'rejected') {
        setIsTracking(true);
      }
    } catch (err) {
      console.error('❌ Erreur fetchOrder:', err);
      setError(err.message);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const generateNotifications = (orderData) => {
    const notifs = [];
    const now = new Date();
    
    // Notification de création
    notifs.push({
      id: 1,
      title: 'Commande créée',
      message: `Votre commande #${orderData.id} a été créée avec succès`,
      time: new Date(orderData.created_at),
      status: 'completed',
      icon: '📝'
    });

    // Normaliser le statut
    const status = orderData.statut || orderData.status;
    
    // Notification d'acceptation
    if (['acceptee', 'accepted', 'en_preparation', 'preparing', 'pret_a_livrer', 'ready', 'livree', 'delivered'].includes(status)) {
      notifs.push({
        id: 2,
        title: 'Commande acceptée',
        message: `Le restaurant a accepté votre commande. Temps de préparation estimé : ${orderData.preparation_time || 30} minutes`,
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '✅'
      });
    }

    // Notification de préparation
    if (['en_preparation', 'preparing', 'pret_a_livrer', 'ready', 'livree', 'delivered'].includes(status)) {
      notifs.push({
        id: 3,
        title: 'Préparation en cours',
        message: 'Votre commande est en cours de préparation',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '👨‍🍳'
      });
    }

    // Notification prête
    if (['pret_a_livrer', 'ready', 'livree', 'delivered'].includes(status)) {
      notifs.push({
        id: 4,
        title: 'Commande prête',
        message: 'Votre commande est prête ! Un livreur va bientôt la récupérer',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '📦'
      });
    }

    // Notification en cours de livraison
    if ((status === 'en_livraison' || status === 'livree' || status === 'delivered') && (orderData.livreur_id || orderData.delivery_id)) {
      notifs.push({
        id: 5,
        title: 'En cours de livraison',
        message: 'Votre commande est en cours de livraison',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '🚚'
      });
    }

    // Notification livrée
    if (status === 'livree' || status === 'delivered') {
      notifs.push({
        id: 6,
        title: 'Commande livrée',
        message: 'Votre commande a été livrée avec succès ! Bon appétit !',
        time: new Date(orderData.updated_at),
        status: 'completed',
        icon: '🎉'
      });
    }

    setNotifications(notifs);
  };

  const getStatusText = (statut) => {
    const status = statut || order?.statut || order?.status;
    switch (status) {
      case 'en_attente':
      case 'pending':
        return 'En attente';
      case 'acceptee':
      case 'accepted':
        return 'Acceptée';
      case 'refusee':
      case 'rejected':
        return 'Refusée';
      case 'en_preparation':
      case 'preparing':
        return 'En préparation';
      case 'pret_a_livrer':
      case 'ready':
        return 'Prête';
      case 'en_livraison':
        return 'En livraison';
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Date non disponible';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Date invalide';
      }
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Erreur formatage date:', error);
      return 'Date invalide';
    }
  };

  // Polling automatique pour suivre les changements de statut
  useEffect(() => {
    if (!isTracking || !orderId) return;

    const interval = setInterval(async () => {
      try {
        // Récupérer la session pour le token
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setIsTracking(false);
          return;
        }

        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        });
        if (response.ok) {
          const data = await response.json();
          
          // Vérifier si le statut a changé
          const currentStatus = data.statut || data.status;
          if (currentStatus !== lastStatus) {
            console.log('🔄 Statut changé:', lastStatus, '→', currentStatus);
            setOrder(data);
            setLastStatus(currentStatus);
            generateNotifications(data);
            
            // Afficher une notification du navigateur
            if (Notification.permission === 'granted') {
              const statusMessages = {
                'acceptee': 'Votre commande a été acceptée !',
                'accepted': 'Votre commande a été acceptée !',
                'en_preparation': 'Votre commande est en cours de préparation',
                'preparing': 'Votre commande est en cours de préparation',
                'pret_a_livrer': 'Votre commande est prête !',
                'ready': 'Votre commande est prête !',
                'livree': 'Votre commande a été livrée !',
                'delivered': 'Votre commande a été livrée !'
              };
              
              new Notification('CVN\'EAT - Mise à jour commande', {
                body: statusMessages[currentStatus] || 'Statut de votre commande mis à jour',
                icon: '/favicon.ico'
              });
            }
            
            // Arrêter le suivi si la commande est terminée
            if (currentStatus === 'livree' || currentStatus === 'delivered' || currentStatus === 'refusee' || currentStatus === 'rejected' || currentStatus === 'annulee' || currentStatus === 'cancelled') {
              setIsTracking(false);
            }
          }
        }
      } catch (error) {
        console.error('Erreur polling:', error);
      }
    }, 5000); // Vérifier toutes les 5 secondes

    return () => clearInterval(interval);
  }, [isTracking, orderId, lastStatus]);

  // Charger l'orderId depuis les query params si présent
  useEffect(() => {
    const orderIdParam = searchParams?.get('orderId');
    if (orderIdParam) {
      setOrderId(orderIdParam);
    }
  }, [searchParams]);

  // Auto-rechercher la commande quand orderId est défini depuis l'URL
  useEffect(() => {
    if (orderId && searchParams?.get('orderId') === orderId) {
      // Attendre un peu pour que l'état soit bien mis à jour et que la commande soit créée en BDD
      const timer = setTimeout(() => {
        console.log('🔄 Auto-recherche de la commande:', orderId);
        fetchOrder();
      }, 1000); // Augmenter le délai pour laisser le temps à la commande d'être créée
      return () => clearTimeout(timer);
    }
  }, [orderId, searchParams]);

  // Demander la permission pour les notifications
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-3 sm:px-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 lg:p-8">
          {/* Bouton retour */}
          <div className="mb-4 sm:mb-6">
            <button
              onClick={() => {
                // Rediriger vers la page des commandes du profil ou l'accueil
                if (order && order.user_id) {
                  router.push('/profile/orders');
                } else {
                  router.push('/');
                }
              }}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors text-sm sm:text-base"
            >
              <FaArrowLeft className="mr-2" />
              Retour
            </button>
          </div>
          
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-center mb-6 sm:mb-8 text-gray-900 dark:text-white">Suivi de commande</h1>
          
          {/* Formulaire de recherche */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Entrez votre numéro de commande (ex: 52)"
                className="flex-1 px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-400 min-h-[44px] touch-manipulation text-sm sm:text-base"
              />
              <button
                onClick={fetchOrder}
                disabled={loading}
                className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap min-h-[44px] touch-manipulation text-sm sm:text-base"
              >
                {loading ? 'Recherche...' : 'Rechercher'}
              </button>
            </div>
            {error && (
              <p className="text-red-600 dark:text-red-400 mt-2 text-sm sm:text-base">{error}</p>
            )}
          </div>

          {/* Affichage de la commande */}
          {order && (
            <div className="space-y-4 sm:space-y-6">
              {/* Informations de base */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <div>
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Commande #{order.id}</h2>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300">Créée le {formatDate(order.created_at)}</p>
                  </div>
                  <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.statut || order.status)}`}>
                    {getStatusText(order.statut || order.status)}
                  </span>
                </div>

                {/* Code de sécurité */}
                {order.security_code && (
                  <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div>
                        <h3 className="font-semibold text-blue-800 dark:text-blue-200 text-sm sm:text-base">🔐 Code de sécurité</h3>
                        <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-300">Donnez ce code au livreur pour récupérer votre commande</p>
                      </div>
                      <div className="text-2xl sm:text-3xl font-mono font-bold text-blue-800 dark:text-blue-200 bg-white dark:bg-gray-700 px-3 sm:px-4 py-2 rounded-lg border-2 border-blue-300 dark:border-blue-600 text-center">
                        {order.security_code}
                      </div>
                    </div>
                  </div>
                )}

                {/* Temps de préparation et annulation */}
                {order.preparation_time && order.statut === 'en_preparation' && (
                  <div className="bg-yellow-50 dark:bg-yellow-900 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 text-sm sm:text-base">
                          ⏱️ Temps de préparation estimé
                        </h3>
                        <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-300">
                          Le restaurant a estimé un temps de préparation de <strong>{order.preparation_time} minutes</strong>
                        </p>
                        {order.preparation_time > 30 && (
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 font-medium">
                            ⚠️ Temps de préparation élevé
                          </p>
                        )}
                      </div>
                      {order.preparation_time > 30 && (
                        <button
                          onClick={async () => {
                            if (confirm(`Êtes-vous sûr de vouloir annuler cette commande ? Le temps de préparation de ${order.preparation_time} minutes est trop long pour vous ?`)) {
                              try {
                                const { data: { session } } = await supabase.auth.getSession();
                                if (!session) {
                                  alert('Vous devez être connecté pour annuler une commande');
                                  return;
                                }
                                
                                const response = await fetch(`/api/orders/${order.id}/cancel`, {
                                  method: 'POST',
                                  headers: {
                                    'Authorization': `Bearer ${session.access_token}`,
                                    'Content-Type': 'application/json'
                                  }
                                });
                                
                                if (response.ok) {
                                  alert('Commande annulée avec succès');
                                  fetchOrder(); // Recharger les données
                                } else {
                                  const error = await response.json();
                                  alert(`Erreur: ${error.error || 'Impossible d\'annuler la commande'}`);
                                }
                              } catch (error) {
                                console.error('Erreur annulation:', error);
                                alert('Erreur lors de l\'annulation de la commande');
                              }
                            }
                          }}
                          className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base text-center"
                        >
                          Annuler la commande
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Chat */}
                <div className="bg-green-50 dark:bg-green-900 border border-green-200 dark:border-green-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                    <div>
                      <h3 className="font-semibold text-green-800 dark:text-green-200 text-sm sm:text-base">💬 Chat</h3>
                      <p className="text-xs sm:text-sm text-green-600 dark:text-green-300">Communiquez avec le restaurant/livreur</p>
                    </div>
                    <a
                      href={`/chat/${order.id}`}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base text-center"
                    >
                      Ouvrir le chat
                    </a>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base text-gray-900 dark:text-white">Informations client</h3>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Nom :</span> {order.customer_name || 'Non renseigné'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      <span className="font-medium">Téléphone :</span> {order.customer_phone || order.deliveryPhone || 'Non renseigné'}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2 text-sm sm:text-base text-gray-900 dark:text-white">Adresse de livraison</h3>
                    <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                      {order.deliveryAddress || order.adresse_livraison || 'Non renseignée'}
                    </p>
                    {(order.deliveryCity || order.deliveryPostalCode) && (
                      <p className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {order.deliveryCity || ''} {order.deliveryPostalCode || ''}
                      </p>
                    )}
                    {order.delivery_instructions && (
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Instructions : {order.delivery_instructions}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Articles commandés */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6">
                <h3 className="font-semibold mb-3 sm:mb-4 text-sm sm:text-base text-gray-900 dark:text-white">Articles commandés</h3>
                <div className="space-y-1 sm:space-y-2">
                  {(order.items || order.details_commande || []).map((item, index) => {
                    const itemName = item.name || item.menus?.nom || 'Article';
                    // IMPORTANT: prix_unitaire contient DÉJÀ les suppléments et la taille
                    // Ne pas les ajouter à nouveau pour éviter le double comptage
                    const itemPrice = parseFloat(item.price || item.prix_unitaire || 0) || 0;
                    const itemQuantity = parseFloat(item.quantity || item.quantite || 0) || 0;
                    // Récupérer les suppléments uniquement pour l'affichage
                    let supplements = [];
                    if (item.supplements && Array.isArray(item.supplements)) {
                      supplements = item.supplements;
                    } else if (item.supplements && typeof item.supplements === 'string') {
                      try {
                        supplements = JSON.parse(item.supplements);
                      } catch (e) {
                        supplements = [];
                      }
                    }

                    // Parser les customisations
                    let customizations = {};
                    if (item.customizations) {
                      if (typeof item.customizations === 'string') {
                        try {
                          customizations = JSON.parse(item.customizations);
                        } catch (e) {
                          customizations = {};
                        }
                      } else {
                        customizations = item.customizations;
                      }
                    }

                    // Le prix_unitaire contient déjà les suppléments, donc on utilise directement itemPrice
                    const totalItemPrice = itemPrice * itemQuantity;
                    return (
                      <div key={index} className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 border-b dark:border-gray-600 pb-2 last:border-0 mb-2">
                        <div className="flex justify-between mb-1">
                          <span className="truncate flex-1 min-w-0 font-medium">{itemName} x{itemQuantity}</span>
                          <span className="ml-2 font-medium">{totalItemPrice.toFixed(2)}€</span>
                        </div>
                        {supplements.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 mt-1">
                            <span className="font-medium">Suppléments:</span>
                            {supplements.map((sup, supIdx) => (
                              <div key={supIdx} className="ml-2">• {sup.nom || sup.name || 'Supplément'} {(sup.prix || sup.price) > 0 && `(+${(sup.prix || sup.price || 0).toFixed(2)}€)`}</div>
                            ))}
                          </div>
                        )}
                        {customizations.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 mt-1">
                            <span className="font-medium">Viandes:</span>
                            {customizations.selectedMeats.map((meat, meatIdx) => (
                              <div key={meatIdx} className="ml-2">• {meat.nom || meat.name} {(meat.prix || meat.price) > 0 && `(+${(meat.prix || meat.price || 0).toFixed(2)}€)`}</div>
                            ))}
                          </div>
                        )}
                        {customizations.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 ml-4 mt-1">
                            <span className="font-medium">Sauces:</span>
                            {customizations.selectedSauces.map((sauce, sauceIdx) => (
                              <div key={sauceIdx} className="ml-2">• {sauce.nom || sauce.name} {(sauce.prix || sauce.price) > 0 && `(+${(sauce.prix || sauce.price || 0).toFixed(2)}€)`}</div>
                            ))}
                          </div>
                        )}
                        {customizations.removedIngredients && Array.isArray(customizations.removedIngredients) && customizations.removedIngredients.length > 0 && (
                          <div className="text-xs text-orange-600 dark:text-orange-400 ml-4 mt-1">
                            <span className="font-medium">Ingrédients retirés:</span>
                            {customizations.removedIngredients.map((ing, ingIdx) => (
                              <div key={ingIdx} className="ml-2">• {ing.nom || ing.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 mt-3 sm:mt-4 pt-3 sm:pt-4">
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <span>Sous-total</span>
                    <span>{(() => {
                      const items = order.items || order.details_commande || [];
                      return (items.reduce((sum, item) => {
                        // IMPORTANT: prix_unitaire contient DÉJÀ les suppléments et la taille
                        // Ne pas les ajouter à nouveau
                        const price = parseFloat(item.price || item.prix_unitaire || 0) || 0;
                        const quantity = parseFloat(item.quantity || item.quantite || 0) || 0;
                        return sum + (price * quantity);
                      }, 0) || 0).toFixed(2);
                    })()}€</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300">
                    <span>Frais de livraison</span>
                    <span>{(parseFloat(order.frais_livraison || order.delivery_fee || 0) || 0).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm sm:text-base lg:text-lg border-t border-gray-200 dark:border-gray-600 pt-2 text-gray-900 dark:text-white">
                    <span>Total</span>
                    <span>{(() => {
                      // Calculer le total correctement : sous-total des articles + frais de livraison
                      // IMPORTANT: prix_unitaire contient DÉJÀ les suppléments et la taille
                      // Utiliser directement order.total depuis la BD si disponible, sinon recalculer
                      const items = order.items || order.details_commande || [];
                      let subtotal;
                      if (order.total && parseFloat(order.total) > 0) {
                        // Utiliser le total stocké dans la commande (qui est déjà correct)
                        subtotal = parseFloat(order.total);
                      } else {
                        // Fallback: recalculer depuis les articles (prix_unitaire contient déjà tout)
                        subtotal = items.reduce((sum, item) => {
                          const price = parseFloat(item.price || item.prix_unitaire || 0) || 0;
                          const quantity = parseFloat(item.quantity || item.quantite || 0) || 0;
                          return sum + (price * quantity);
                        }, 0);
                      }
                      const deliveryFee = parseFloat(order.frais_livraison || order.delivery_fee || 0) || 0;
                      const totalWithDelivery = subtotal + deliveryFee;
                      return totalWithDelivery.toFixed(2);
                    })()}€</span>
                  </div>
                </div>
                
                {/* Afficher les infos de remboursement si la commande est annulée */}
                {(order.statut === 'annulee' || order.status === 'annulee') && order.refund_amount && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-semibold text-green-800 dark:text-green-300 mb-1">
                          ✓ Commande remboursée
                        </h4>
                        <p className="text-xs sm:text-sm text-green-700 dark:text-green-400">
                          Montant remboursé: <strong>{parseFloat(order.refund_amount || 0).toFixed(2)}€</strong>
                        </p>
                        {(() => {
                          // Vérifier si le remboursement inclut les frais de livraison
                          const refundAmount = parseFloat(order.refund_amount || 0);
                          const orderTotal = parseFloat(order.total || 0);
                          const deliveryFee = parseFloat(order.frais_livraison || 0);
                          const totalPaid = orderTotal + deliveryFee;
                          
                          // Si le remboursement est inférieur au total payé, afficher un avertissement
                          if (refundAmount < totalPaid - 0.01) {
                            return (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">
                                ⚠️ Note: Ce remboursement ({refundAmount.toFixed(2)}€) ne comprend pas les frais de livraison ({deliveryFee.toFixed(2)}€). 
                                Le montant total payé était de {totalPaid.toFixed(2)}€. 
                                Veuillez contacter le support si vous souhaitez un remboursement complet.
                              </p>
                            );
                          }
                          return null;
                        })()}
                        {order.refunded_at && (
                          <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                            Remboursement effectué le {new Date(order.refunded_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                        <p className="text-xs text-green-600 dark:text-green-500 mt-2">
                          Le remboursement apparaîtra sur votre compte bancaire dans 2-5 jours ouvrables.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline des notifications */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">Suivi de votre commande</h3>
                  {isTracking && (
                    <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs sm:text-sm font-medium">Suivi en temps réel</span>
                    </div>
                  )}
                </div>
                <div className="space-y-3 sm:space-y-4">
                  {notifications.map((notif, index) => (
                    <div key={notif.id} className="flex items-start space-x-3 sm:space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                          <span className="text-sm sm:text-lg">{notif.icon}</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start space-y-1 sm:space-y-0">
                          <h4 className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">{notif.title}</h4>
                          <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{formatDate(notif.time)}</span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm mt-1">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Message d'aide */}
          {!order && (
            <div className="text-center text-gray-500 dark:text-gray-400">
              <div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📱</div>
              <p className="text-base sm:text-lg">Entrez votre numéro de commande pour suivre votre livraison</p>
              <p className="text-xs sm:text-sm mt-2">Vous recevrez des notifications en temps réel sur l'avancement</p>
              <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
                <p className="text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                  <strong>🔒 Sécurité :</strong> Vous devez être connecté pour suivre une commande. 
                  Vous ne pouvez voir que vos propres commandes.
                </p>
                <div className="mt-2 sm:mt-3 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-center sm:items-center">
                  <a 
                    href="/login" 
                    className="inline-block bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base"
                  >
                    Se connecter
                  </a>
                  <span className="mx-2 text-gray-400 dark:text-gray-500 text-sm">ou</span>
                  <a 
                    href="/register" 
                    className="inline-block bg-green-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-green-700 transition-colors min-h-[44px] touch-manipulation text-sm sm:text-base"
                  >
                    S'inscrire
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
