'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaArrowLeft, FaSpinner, FaEdit } from 'react-icons/fa';

export default function AdminOrderDetail() {
  const router = useRouter();
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchOrder();
    }
  }, [params.id]);

  const fetchOrder = async () => {
    try {
      // D'abord récupérer la commande avec les relations
      const { data, error } = await supabase
        .from('commandes')
        .select(`
          *,
          restaurants (
            id,
            nom
          ),
          details_commande (
            id,
            quantite,
            prix_unitaire,
            supplements,
            customizations,
            menus (
              nom,
              prix
            )
          )
        `)
        .eq('id', params.id)
        .single();

      if (error) throw error;
      
      // Ensuite, récupérer les infos utilisateur séparément si user_id existe
      let userData = null;
      if (data.user_id) {
        try {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('id, nom, prenom, telephone, email')
            .eq('id', data.user_id)
            .single();
          
          if (!userError && user) {
            userData = user;
          }
        } catch (userErr) {
          console.warn('Erreur récupération utilisateur:', userErr);
        }
      }
      
      // Ajouter les données utilisateur à l'objet data
      if (userData) {
        data.users = userData;
      }
      
      // Formater les données pour l'affichage
      if (data) {
        // Récupérer les informations client depuis users (jointure) ou depuis les colonnes directes
        const user = data.users || {};
        
        // Priorité: colonnes directes dans commandes, sinon jointure avec users
        const customerName = data.customer_name 
          || (user.prenom && user.nom ? `${user.prenom} ${user.nom}`.trim() : user.nom)
          || 'Client inconnu';
        
        const customerPhone = data.customer_phone || user.telephone || '';
        const customerEmail = data.customer_email || user.email || '';
        
        // Formater les items depuis details_commande
        const items = (data.details_commande || []).map(detail => {
          // Parser les customizations si c'est une string
          let customizations = detail.customizations;
          if (typeof customizations === 'string') {
            try {
              customizations = JSON.parse(customizations);
            } catch (e) {
              customizations = {};
            }
          }
          
          // Pour les combos, utiliser le nom du combo
          const isCombo = customizations?.combo?.comboName;
          const displayName = isCombo ? customizations.combo.comboName : (detail.menus?.nom || 'Article');
          
          return {
            id: detail.id,
            name: displayName,
            quantity: detail.quantite || 1,
            price: parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0,
            customizations: customizations || null,
            isFreeDrink: customizations?.is_free_drink === true,
            isCombo: isCombo || false,
            comboDetails: customizations?.combo?.details || null,
            supplements: detail.supplements || null
          };
        });
        
        setOrder({
          ...data,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          delivery_address: data.adresse_livraison || '',
          delivery_postal_code: data.code_postal || '',
          delivery_city: data.ville || '',
          items: items,
          restaurant_name: data.restaurants?.nom || 'Restaurant inconnu'
        });
      } else {
        setOrder(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (newStatus) => {
    setUpdating(true);
    try {
      // Convertir les statuts anglais en français si nécessaire
      const statusMap = {
        'pending': 'en_attente',
        'accepted': 'acceptee',
        'rejected': 'refusee',
        'preparing': 'en_preparation',
        'ready': 'pret_a_livrer',
        'delivered': 'livree'
      };
      
      const frenchStatus = statusMap[newStatus] || newStatus;
      
      const { error } = await supabase
        .from('commandes')
        .update({ statut: frenchStatus })
        .eq('id', params.id);

      if (error) throw error;
      
      // Rafraîchir les données
      await fetchOrder();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptée';
      case 'rejected': return 'Refusée';
      case 'preparing': return 'En préparation';
      case 'ready': return 'Prête';
      case 'delivered': return 'Livrée';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-gray-500">Commande non trouvée</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/orders')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft />
            </button>
            <h1 className="text-3xl font-bold">Commande #{order.id}</h1>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(order.statut || order.status)}`}>
            {getStatusText(order.statut || order.status)}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Informations client */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Informations client</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Nom</label>
                <p className="text-gray-900">{order.customer_name || 'Non renseigné'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Téléphone</label>
                <p className="text-gray-900">{order.customer_phone || 'Non renseigné'}</p>
              </div>
              {order.customer_email && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Email</label>
                  <p className="text-gray-900">{order.customer_email}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Adresse de livraison</label>
                <p className="text-gray-900">{order.delivery_address}</p>
                <p className="text-gray-900">{order.delivery_postal_code} {order.delivery_city}</p>
              </div>
              {order.delivery_instructions && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Instructions de livraison</label>
                  <p className="text-gray-900">{order.delivery_instructions}</p>
                </div>
              )}
            </div>
          </div>

          {/* Détails de la commande */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Détails de la commande</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-600">Restaurant</label>
                <p className="text-gray-900">{order.restaurant_name || order.restaurant_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Date de création</label>
                <p className="text-gray-900">
                  {new Date(order.created_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Dernière mise à jour</label>
                <p className="text-gray-900">
                  {new Date(order.updated_at).toLocaleString('fr-FR')}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Total</label>
                <p className="text-2xl font-bold text-gray-900">
                  {(parseFloat(order.total || order.total_amount || 0)).toFixed(2)}€
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Frais de livraison</label>
                <p className="text-gray-900">
                  {(parseFloat(order.frais_livraison || order.delivery_fee || 0)).toFixed(2)}€
                </p>
              </div>
              {/* Code promo / Gain de la roue */}
              {(order.promo_code || order.discount_amount > 0) && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <label className="text-sm font-medium text-gray-600">Code promo / Gain</label>
                  {order.promo_code && (
                    <div className="mt-2 p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-purple-800">🎁 Code utilisé: {order.promo_code}</p>
                          {order.discount_amount > 0 && (
                            <p className="text-sm text-purple-600 mt-1">
                              Réduction appliquée: -{order.discount_amount.toFixed(2)}€
                            </p>
                          )}
                        </div>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                          Gain roue
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Articles commandés */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Articles commandés</h2>
          {order.items && order.items.length > 0 ? (
            <div className="space-y-3">
              {order.items.map((item, index) => {
                // Parser les customizations si c'est une string
                let customizations = item.customizations;
                if (typeof customizations === 'string') {
                  try {
                    customizations = JSON.parse(customizations);
                  } catch (e) {
                    customizations = {};
                  }
                }
                
                const isCombo = customizations?.combo?.comboName || item.isCombo;
                const comboDetails = customizations?.combo?.details || item.comboDetails || [];
                
                // Parser les suppléments
                let supplements = item.supplements;
                if (typeof supplements === 'string') {
                  try {
                    supplements = JSON.parse(supplements);
                  } catch (e) {
                    supplements = [];
                  }
                }
                if (!Array.isArray(supplements)) supplements = [];
                
                return (
                  <div key={index} className={`p-3 rounded-lg mb-3 ${
                    item.isFreeDrink ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gray-50'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{item.name}</p>
                          {isCombo && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                              🍔 Menu composé
                            </span>
                          )}
                          {item.isFreeDrink && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                              🎁 Boisson offerte (Roue)
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">Quantité: {item.quantity}</p>
                      </div>
                      <div className="text-right">
                        {item.isFreeDrink ? (
                          <div>
                            <p className="font-semibold text-green-600 line-through text-gray-400 text-sm">
                              {((parseFloat(item.price || 0)) * (parseFloat(item.quantity || 0))).toFixed(2)}€
                            </p>
                            <p className="font-bold text-green-700">GRATUIT</p>
                          </div>
                        ) : (
                          <p className="font-medium">
                            {((parseFloat(item.price || 0)) * (parseFloat(item.quantity || 0))).toFixed(2)}€
                          </p>
                        )}
                        <p className="text-sm text-gray-600">
                          {(parseFloat(item.price || 0)).toFixed(2)}€ l'unité
                        </p>
                      </div>
                    </div>
                    
                    {/* Détails du menu composé */}
                    {isCombo && comboDetails && comboDetails.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Détails du menu :</p>
                        <div className="space-y-1">
                          {comboDetails.map((detail, detailIndex) => (
                            <div key={detailIndex} className="text-xs text-gray-600 ml-2">
                              <span className="font-medium">{detail.stepTitle}:</span> {detail.optionName}
                              {detail.variantName && ` (${detail.variantName})`}
                              {(detail.optionPrice > 0 || detail.variantPrice > 0) && (
                                <span className="text-orange-600">
                                  {' '}(+{((detail.optionPrice || 0) + (detail.variantPrice || 0)).toFixed(2)}€)
                                </span>
                              )}
                              {detail.removedIngredients && detail.removedIngredients.length > 0 && (
                                <span className="text-red-500 text-xs ml-1">
                                  {' '}(Sans: {detail.removedIngredients.map(ing => ing.nom).join(', ')})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Suppléments */}
                    {supplements && supplements.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Suppléments :</p>
                        <div className="space-y-1">
                          {supplements.map((sup, supIndex) => (
                            <div key={supIndex} className="text-xs text-gray-600 ml-2">
                              • {sup.nom || sup.name}
                              {(sup.prix || sup.price) > 0 && (
                                <span className="text-blue-600"> (+{(sup.prix || sup.price || 0).toFixed(2)}€)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Viandes et sauces */}
                    {customizations?.selectedMeats && Array.isArray(customizations.selectedMeats) && customizations.selectedMeats.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Viandes :</p>
                        <div className="space-y-1">
                          {customizations.selectedMeats.map((meat, meatIndex) => (
                            <div key={meatIndex} className="text-xs text-gray-600 ml-2">
                              • {meat.nom || meat.name}
                              {(meat.prix || meat.price) > 0 && (
                                <span className="text-blue-600"> (+{(meat.prix || meat.price || 0).toFixed(2)}€)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {customizations?.selectedSauces && Array.isArray(customizations.selectedSauces) && customizations.selectedSauces.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-semibold text-gray-700 mb-1">Sauces :</p>
                        <div className="space-y-1">
                          {customizations.selectedSauces.map((sauce, sauceIndex) => (
                            <div key={sauceIndex} className="text-xs text-gray-600 ml-2">
                              • {sauce.nom || sauce.name}
                              {(sauce.prix || sauce.price) > 0 && (
                                <span className="text-blue-600"> (+{(sauce.prix || sauce.price || 0).toFixed(2)}€)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">Aucun article trouvé</p>
          )}
        </div>

        {/* Actions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            {(order.status === 'pending' || order.statut === 'en_attente') && (
              <>
                <button
                  onClick={() => updateOrderStatus('accepted')}
                  disabled={updating}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updating ? <FaSpinner className="animate-spin" /> : 'Accepter la commande'}
                </button>
                <button
                  onClick={() => updateOrderStatus('rejected')}
                  disabled={updating}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {updating ? <FaSpinner className="animate-spin" /> : 'Refuser la commande'}
                </button>
              </>
            )}
            {(order.status === 'accepted' || order.statut === 'acceptee') && (
              <button
                onClick={() => updateOrderStatus('preparing')}
                disabled={updating}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer en préparation'}
              </button>
            )}
            {(order.status === 'preparing' || order.statut === 'en_preparation') && (
              <button
                onClick={() => updateOrderStatus('ready')}
                disabled={updating}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer prête'}
              </button>
            )}
            {(order.status === 'ready' || order.statut === 'pret_a_livrer') && (
              <button
                onClick={() => updateOrderStatus('delivered')}
                disabled={updating}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {updating ? <FaSpinner className="animate-spin" /> : 'Marquer livrée'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 