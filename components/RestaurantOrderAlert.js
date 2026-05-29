'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function RestaurantOrderAlert() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);

  useEffect(() => {
    fetchPendingOrders();
    
    // Écouter les mises à jour de commandes en temps réel
    // NOUVEAU WORKFLOW: On écoute les UPDATE car le restaurant doit être notifié quand un livreur accepte
    const channel = supabase
      .channel('restaurant-orders')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', // NOUVEAU: On écoute UPDATE au lieu de INSERT
          schema: 'public', 
          table: 'commandes',
          filter: 'statut=eq.en_attente'
        }, 
        (payload) => {
          console.log('Commande mise à jour:', payload.new);
          
          // CRITIQUE: Ne notifier QUE si un livreur vient d'être assigné (passage de null à non-null)
          const oldHasDelivery = payload.old?.livreur_id === null || payload.old?.livreur_id === undefined;
          const newHasDelivery = payload.new.livreur_id !== null && payload.new.livreur_id !== undefined;
          
          // Vérifier que la commande est payée
          if (payload.new.payment_status !== 'paid' && payload.new.payment_status !== 'succeeded') {
            console.log('⚠️ Commande non payée ignorée:', payload.new.id);
            return;
          }
          
          // Si un livreur vient JUSTE d'être assigné ET statut = 'en_attente'
          if (oldHasDelivery && newHasDelivery && payload.new.statut === 'en_attente') {
            console.log('✅ Nouvelle commande avec livreur assigné:', payload.new.id);
            fetchPendingOrders(); // Rafraîchir la liste
          } else {
            console.log('⚠️ Commande ignorée (pas de nouveau livreur ou statut incorrect):', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPendingOrders = async () => {
    try {
      // Récupérer l'utilisateur connecté et son restaurant
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.error('❌ Aucune session trouvée');
        setLoading(false);
        return;
      }

      // Récupérer le restaurant de l'utilisateur
      const { data: restaurant, error: restoError } = await supabase
        .from('restaurants')
        .select('id, nom')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !restaurant) {
        console.error('❌ Restaurant non trouvé:', restoError);
        setLoading(false);
        return;
      }
      
      // Stocker le restaurant pour l'utiliser dans le calcul de commission
      setRestaurant(restaurant);

    // Récupérer les commandes en attente : livraison (livreur assigné) ou retrait sur place
    const { data, error } = await supabase
      .from('commandes')
      .select(`
        id,
        created_at,
        updated_at,
        statut,
        total_amount,
        total,
        delivery_fee,
        frais_livraison,
        restaurant_id,
        user_id,
        livreur_id,
        order_fulfillment,
        customer_name,
        customer_phone,
        customer_email,
        delivery_address,
        delivery_city,
        delivery_postal_code,
        delivery_instructions,
        adresse_livraison,
        instructions,
        items,
        details_commande (
          id,
          plat_id,
          quantite,
          prix_unitaire,
          menus (
            nom,
            prix
          )
        ),
        users (
          nom,
          prenom,
          telephone
        )
      `)
      .eq('statut', 'en_attente')
      .eq('payment_status', 'paid')
      .eq('restaurant_id', restaurant.id)
      .or('livreur_id.not.is.null,order_fulfillment.eq.pickup')
      .order('created_at', { ascending: false });

      if (error) throw error;
      
      console.log('✅ Commandes récupérées:', data?.length || 0);
      setOrders(data || []);
    } catch (error) {
      console.error('❌ Erreur récupération commandes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOrder = async (orderId) => {
    try {
      console.log('🔄 Acceptation commande:', orderId);
      
      // Récupérer la session pour l'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Vous devez être connecté pour accepter une commande');
        return;
      }

      const token = session.access_token;
      
      // Utiliser l'API route pour accepter la commande
      const response = await fetch(`/api/restaurants/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: 'acceptee',
          preparation_time: 20 // Temps par défaut, peut être modifié plus tard
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'acceptation');
      }

      console.log('✅ Commande acceptée:', data);
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Afficher un message de succès
      alert('Commande acceptée avec succès !');
      
    } catch (error) {
      console.error('❌ Erreur acceptation commande:', error);
      alert(`Erreur lors de l'acceptation de la commande: ${error.message}`);
    }
  };

  const handleRejectOrder = async (orderId) => {
    try {
      // Demander la raison du refus
      const reason = prompt('Raison du refus de la commande (optionnel):') || 'Non spécifiée';
      
      // Mettre à jour le statut de la commande
      const { error } = await supabase
        .from('commandes')
        .update({ 
          statut: 'annulee',
          rejection_reason: reason,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (error) throw error;
      
      // Rembourser automatiquement la commande
      try {
        const refundResponse = await fetch('/api/orders/refund', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            orderId: orderId,
            reason: `Refusé par le restaurant: ${reason}`
          })
        });

        if (refundResponse.ok) {
          console.log('✅ Remboursement effectué automatiquement');
        } else {
          console.error('❌ Erreur remboursement automatique');
        }
      } catch (refundError) {
        console.error('Erreur remboursement:', refundError);
        // Ne pas bloquer le rejet si le remboursement échoue
      }
      
      // Retirer la commande de la liste
      setOrders(prev => prev.filter(order => order.id !== orderId));
      
      // Notifier le client
      await notifyCustomerRejection(orderId, reason);
      
    } catch (error) {
      console.error('Erreur rejet commande:', error);
      alert('Erreur lors du rejet de la commande');
    }
  };

  // Fonction pour notifier le client du refus
  const notifyCustomerRejection = async (orderId, reason) => {
    try {
      // Récupérer les infos de la commande
      const { data: order } = await supabase
        .from('orders')
        .select('customer_email, customer_name, customer_phone, total_amount')
        .eq('id', orderId)
        .single();

      if (!order) return;

      console.log(`📧 Notification refus envoyée à ${order.customer_email}`);
      console.log(`💰 Montant à rembourser: ${order.total_amount}€`);
      console.log(`📝 Raison: ${reason}`);

      // Ici vous pouvez intégrer un service d'email/SMS
      // await sendRejectionEmail(order.customer_email, orderId, reason);
      // await sendRejectionSMS(order.customer_phone, orderId, reason);

    } catch (error) {
      console.error('Erreur notification refus:', error);
    }
  };


  const calculateEstimatedTime = (items) => {
    // Estimation basée sur le nombre d'articles
    if (!items || !Array.isArray(items) || items.length === 0) {
      return 15; // Temps par défaut
    }
    const baseTime = 15; // 15 minutes de base
    const itemTime = items.length * 5; // 5 minutes par article
    return baseTime + itemTime;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-600">Aucune commande en attente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        🚨 Commandes en Attente ({orders.length})
      </h2>
      
      {orders.map((order) => (
        <div key={order.id} className="bg-white border-2 border-orange-300 rounded-lg p-6 shadow-lg">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                Commande #{order.id}
              </h3>
              <p className="text-sm text-gray-600">
                {new Date(order.created_at).toLocaleString('fr-FR')}
              </p>
            </div>
            <div className="text-right">
              {(() => {
                const totalAmount = parseFloat(order.total_amount || order.total || 0);
                const deliveryFee = parseFloat(order.delivery_fee || order.frais_livraison || 0);
                const total = totalAmount + deliveryFee;
                
                // Vérifier si c'est "La Bonne Pâte" (pas de commission)
                const normalizedRestaurantName = (restaurant?.nom || '')
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .toLowerCase();
                const isInternalRestaurant = normalizedRestaurantName.includes('la bonne pate');
                const commissionRate = isInternalRestaurant ? 0 : 0.20; // 20% pour CVN'EAT
                
                const commission = totalAmount * commissionRate;
                const restaurantGain = totalAmount - commission;
                
                return (
                  <>
                    <p className="text-lg font-bold text-gray-800">
                      Total: {total.toFixed(2)}€
                    </p>
                    {totalAmount > 0 && (
                      <>
                        <p className="text-sm font-semibold text-green-600">
                          Votre gain: {restaurantGain.toFixed(2)}€
                        </p>
                        {commissionRate > 0 && (
                          <p className="text-xs text-gray-500">
                            (Commission 20%: {commission.toFixed(2)}€)
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-sm text-gray-500 mt-1">
                      Temps estimé: {calculateEstimatedTime(order.items || order.details_commande || [])} min
                    </p>
                  </>
                );
              })()}
            </div>
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Client:</h4>
            <p className="text-gray-600">
              {
                (order.users?.prenom && order.users?.nom) 
                  ? `${order.users.prenom} ${order.users.nom}`.trim()
                  : order.users?.nom 
                  ? order.users.nom
                  : (order.customer?.firstName && order.customer?.lastName)
                  ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
                  : order.customer_name || order.customer?.lastName || 'Client'
              } - {order.customer_phone || order.users?.telephone || order.customer?.phone || 'N/A'}
            </p>
            <p className="text-gray-600">
              {order.delivery_address || order.adresse_livraison || 'N/A'}, {order.delivery_city || 'N/A'} {order.delivery_postal_code || 'N/A'}
            </p>
            {(order.delivery_instructions || order.instructions) && (
              <p className="text-gray-600 italic">
                Instructions: {order.delivery_instructions || order.instructions}
              </p>
            )}
          </div>

          <div className="mb-4">
            <h4 className="font-semibold text-gray-700 mb-2">Articles:</h4>
            <div className="space-y-1">
              {order.items && Array.isArray(order.items) && order.items.length > 0 ? (
                order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.name}</span>
                    <span>{item.price}€</span>
                  </div>
                ))
              ) : order.details_commande && Array.isArray(order.details_commande) && order.details_commande.length > 0 ? (
                order.details_commande.map((item, index) => {
                  const prixUnitaire = parseFloat(item.prix_unitaire || 0);
                  const quantite = parseInt(item.quantite || 0, 10);
                  return (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{quantite}x {item.menus?.nom || 'Plat'}</span>
                      <span>{(prixUnitaire * quantite).toFixed(2)}€</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-gray-500">Aucun article trouvé</p>
              )}
            </div>
            {(() => {
              const totalAmount = parseFloat(order.total_amount || order.total || 0);
              const deliveryFee = parseFloat(order.delivery_fee || order.frais_livraison || 0);
              const total = totalAmount + deliveryFee;
              
              return (
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-sm">
                    <span>Sous-total:</span>
                    <span>{totalAmount.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Frais de livraison:</span>
                    <span>{deliveryFee.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Total:</span>
                    <span>{total.toFixed(2)}€</span>
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => handleAcceptOrder(order.id)}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              ✅ Accepter
            </button>
            <button
              onClick={() => handleRejectOrder(order.id)}
              className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              ❌ Refuser
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
