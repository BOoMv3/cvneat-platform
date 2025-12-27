'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaClock, FaCheck, FaTimes, FaEye, FaMotorcycle, FaUtensils } from 'react-icons/fa';
import AuthGuard from '../../../components/AuthGuard';
import Navbar from '../../../components/Navbar';

export default function PartnerOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [acceptingOrder, setAcceptingOrder] = useState(false);
  const [rejectingOrder, setRejectingOrder] = useState(false);
  const router = useRouter();

  // État pour l'estimation du temps
  const [timeEstimation, setTimeEstimation] = useState({
    preparationTime: 15,
    deliveryTime: 20,
    estimatedTotalTime: 35
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const getCustomerName = (order) => {
    const firstName = order?.customer?.firstName || order?.customer_first_name || order?.users?.prenom || '';
    const lastName = order?.customer?.lastName || order?.customer_last_name || order?.users?.nom || '';
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;
    return order?.customer?.email || order?.customer_email || order?.users?.email || 'Client';
  };

  const getCustomerPhone = (order) => {
    return order?.customer?.phone || order?.customer_phone || order?.users?.telephone || '';
  };

  const getCustomerEmail = (order) => {
    return order?.customer?.email || order?.customer_email || order?.users?.email || '';
  };

  const getSubtotal = (order) => {
    // IMPORTANT: Toujours recalculer depuis details_commande pour garantir l'exactitude
    // Ne pas utiliser order.total qui peut être incorrect pour les anciennes commandes
    // prix_unitaire contient DÉJÀ les suppléments, ne pas les ajouter à nouveau
    if (Array.isArray(order?.details_commande) && order.details_commande.length > 0) {
      const calculated = order.details_commande.reduce((sum, detail) => {
        // prix_unitaire contient déjà le prix de base + suppléments + viandes + sauces + taille
        const prixUnitaire = Number(detail.prix_unitaire || 0);
        const quantite = Number(detail.quantite || 1);
        const totalItemPrice = prixUnitaire * quantite;
        
        console.log(`💰 Item: ${detail.menus?.nom || 'Sans nom'}, prix_unitaire: ${prixUnitaire}€, quantite: ${quantite}, total: ${totalItemPrice}€`);
        
        return sum + totalItemPrice;
      }, 0);
      
      console.log(`💰 Commande ${order.id?.slice(0, 8)}: Total calculé = ${calculated}€, order.total = ${order.total}€`);
      return calculated;
    }
    
    // Fallback : utiliser order_items si disponible
    if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
      return order.order_items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    }
    
    // Dernier fallback : utiliser subtotal ou total (mais ce n'est pas fiable)
    if (typeof order?.subtotal === 'number') return order.subtotal;
    if (typeof order?.total === 'number') return order.total;
    return Number(order?.total_amount ?? 0);
  };

  const getDeliveryFee = (order) => {
    return Number(order?.delivery_fee ?? order?.frais_livraison ?? 0);
  };

  const getTotalAmount = (order) => {
    if (typeof order?.total_amount === 'number') return order.total_amount;
    return getSubtotal(order) + getDeliveryFee(order);
  };

  const getOrderItems = (order) => {
    if (Array.isArray(order?.order_items) && order.order_items.length > 0) {
      return order.order_items;
    }
    return (order?.details_commande || []).map(detail => {
      // Parser les customizations pour détecter les boissons de formule
      let customizations = {};
      if (detail.customizations) {
        if (typeof detail.customizations === 'string') {
          try {
            customizations = JSON.parse(detail.customizations);
          } catch (e) {
            customizations = {};
          }
        } else {
          customizations = detail.customizations;
        }
      }
      
      const isFormulaDrink = customizations.is_formula_drink === true;
      const isMenuDrink = customizations.is_menu_drink === true;
      const formulaName = customizations.formula_name;
      const menuName = customizations.menu_name;
      let itemName = detail.menus?.nom || detail.name || 'Article';
      
      // Ajouter un indicateur pour les boissons de formule ou de menu
      if (isFormulaDrink) {
        itemName = `${itemName} 🥤 (boisson formule${formulaName ? ` - ${formulaName}` : ''})`;
      } else if (isMenuDrink) {
        itemName = `${itemName} 🥤 (boisson menu${menuName ? ` - ${menuName}` : ''})`;
      }
      
      return {
        id: detail.id,
        name: itemName,
        quantity: detail.quantite || detail.quantity || 0,
        price: Number(detail.prix_unitaire || detail.price || detail.menus?.prix || 0),
        customizations: customizations
      };
    });
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const token = session.access_token;
      const response = await fetch('/api/partner/orders', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Erreur lors du chargement des commandes');
      }

      const data = await response.json();
      setOrders(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async () => {
    if (!selectedOrder) return;

    try {
      setAcceptingOrder(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/restaurants/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'acceptee',
          preparation_time: timeEstimation.preparationTime
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors de l\'acceptation');
      }

      await fetchOrders();
      setShowAcceptModal(false);
      setSelectedOrder(null);
      setTimeEstimation({
        preparationTime: 15,
        deliveryTime: 20,
        estimatedTotalTime: 35
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingOrder(false);
    }
  };

  const handleRejectOrder = async () => {
    if (!selectedOrder) return;

    try {
      setRejectingOrder(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const response = await fetch(`/api/restaurants/orders/${selectedOrder.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'refusee',
          reason: rejectReason
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erreur lors du refus');
      }

      await fetchOrders();
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedOrder(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setRejectingOrder(false);
    }
  };

  const updateTotalTime = () => {
    const total = timeEstimation.preparationTime + timeEstimation.deliveryTime;
    setTimeEstimation(prev => ({ ...prev, estimatedTotalTime: total }));
  };

  useEffect(() => {
    updateTotalTime();
  }, [timeEstimation.preparationTime, timeEstimation.deliveryTime]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_attente': return 'bg-yellow-100 text-yellow-800';
      case 'acceptee': return 'bg-blue-100 text-blue-800';
      case 'en_preparation': return 'bg-orange-100 text-orange-800';
      case 'pret': return 'bg-green-100 text-green-800';
      case 'en_livraison': return 'bg-purple-100 text-purple-800';
      case 'livree': return 'bg-gray-100 text-gray-800';
      case 'annulee': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'en_attente': return 'En attente';
      case 'acceptee': return 'Acceptée';
      case 'en_preparation': return 'En préparation';
      case 'pret': return 'Prête';
      case 'en_livraison': return 'En livraison';
      case 'livree': return 'Livrée';
      case 'annulee': return 'Annulée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <AuthGuard requiredRole="partner">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Commandes</h1>
            <button
              onClick={fetchOrders}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Actualiser
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <div className="grid gap-6">
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">Aucune commande pour le moment</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="bg-white rounded-lg shadow-sm p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Commande #{order.id.slice(0, 8)}</h3>
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-sm text-gray-600">
                        Client: {getCustomerName(order)}
                      </p>
                      {getCustomerPhone(order) && (
                        <p className="text-sm text-gray-600">Téléphone: {getCustomerPhone(order)}</p>
                      )}
                      {getCustomerEmail(order) && (
                        <p className="text-sm text-gray-600">Email: {getCustomerEmail(order)}</p>
                      )}
                      {order.delivery_time && (
                        <p className="text-sm text-blue-600 font-medium mt-1">
                          <FaMotorcycle className="inline mr-1" />
                          Temps de livraison: {order.delivery_time} min
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.statut)}`}>
                      {getStatusText(order.statut)}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium mb-2">Articles commandés :</h4>
                    <div className="space-y-2">
                      {getOrderItems(order).map((item) => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span>{item.quantity}x {item.name}</span>
                          <span>{(item.price * item.quantity).toFixed(2)}€</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="text-lg font-bold">
                      Total: {getTotalAmount(order).toFixed(2)}€
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setTimeEstimation({
                            preparationTime: 15,
                            deliveryTime: 20,
                            estimatedTotalTime: 35
                          });
                          setShowAcceptModal(true);
                        }}
                        disabled={order.statut !== 'en_attente'}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          order.statut === 'en_attente'
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <FaCheck />
                        Accepter
                      </button>
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setRejectReason('');
                          setShowRejectModal(true);
                        }}
                        disabled={order.statut !== 'en_attente'}
                        className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                          order.statut === 'en_attente'
                            ? 'bg-red-600 text-white hover:bg-red-700'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }`}
                      >
                        <FaTimes />
                        Refuser
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal d'acceptation avec estimation du temps */}
          {showAcceptModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">Accepter la commande</h2>
                <p className="text-gray-600 mb-6">
                Estimez le temps de préparation et de livraison pour cette commande.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaUtensils className="inline mr-2" />
                      Temps de préparation (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={timeEstimation.preparationTime}
                      onChange={(e) => setTimeEstimation(prev => ({
                        ...prev,
                        preparationTime: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaMotorcycle className="inline mr-2" />
                      Temps de livraison (minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="45"
                      value={timeEstimation.deliveryTime}
                      onChange={(e) => setTimeEstimation(prev => ({
                        ...prev,
                        deliveryTime: parseInt(e.target.value) || 0
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">
                        <FaClock className="inline mr-2" />
                        Temps total estimé :
                      </span>
                      <span className="text-lg font-bold text-blue-900">
                        {timeEstimation.estimatedTotalTime} minutes
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowAcceptModal(false);
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleAcceptOrder}
                    disabled={acceptingOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {acceptingOrder ? 'Acceptation...' : 'Accepter la commande'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal de refus */}
          {showRejectModal && selectedOrder && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <h2 className="text-xl font-bold mb-4">Refuser la commande</h2>
                <p className="text-gray-600 mb-6">
                  Indiquez la raison du refus. Elle sera transmises au client.
                </p>

                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Raison du refus (optionnel)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 min-h-[120px]"
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => {
                      setShowRejectModal(false);
                      setRejectReason('');
                      setSelectedOrder(null);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleRejectOrder}
                    disabled={rejectingOrder}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {rejectingOrder ? 'Refus...' : 'Refuser la commande'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AuthGuard>
    </div>
  );
} 