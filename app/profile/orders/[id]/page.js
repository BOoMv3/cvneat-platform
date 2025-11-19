'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../../../../components/Navbar';
import { FaArrowLeft, FaSpinner, FaCheck, FaTimes } from 'react-icons/fa';
import { supabase } from '../../../../lib/supabase';

export default function OrderDetail({ params }) {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [orderId, setOrderId] = useState(null);

  // Gérer params qui peut être une Promise dans Next.js App Router
  useEffect(() => {
    const resolveParams = async () => {
      const resolvedParams = await Promise.resolve(params);
      const id = resolvedParams?.id;
      if (id) {
        setOrderId(id);
      }
    };
    resolveParams();
  }, [params]);

  useEffect(() => {
    const checkUserAndFetchOrder = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        if (!user) {
            router.push('/login');
            return;
        }
        
        if(orderId) {
          await fetchOrder(orderId);
        }
    };
    
    if (orderId) {
      checkUserAndFetchOrder();
    }
  }, [orderId, router]);

  const fetchWithAuth = async (url, options = {}) => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
  };
  
  const fetchOrder = async (id) => {
    if (!id) {
      setError('ID de commande manquant');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    try {
      // Utiliser l'API correcte pour récupérer une commande par ID
      const response = await fetchWithAuth(`/api/orders/${id}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 404) {
          setError('Commande non trouvée');
        } else if (response.status === 403) {
          setError('Vous n\'êtes pas autorisé à voir cette commande');
        } else if (response.status === 401) {
          setError('Authentification requise. Veuillez vous reconnecter.');
          router.push('/login');
        } else {
          const errorMessage = errorData.error || errorData.message || 'Erreur lors du chargement de la commande';
          setError(errorMessage);
          console.error('Erreur récupération commande:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        }
        setLoading(false);
        return;
      }
      const data = await response.json();
      setOrder(data);
    } catch (error) {
      console.error('Erreur fetchOrder:', error);
      setError('Erreur lors du chargement de la commande. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    // Support des statuts français et anglais
    const statut = status || '';
    if (statut === 'en_attente' || statut === 'pending') return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200';
    if (statut === 'en_preparation' || statut === 'preparing') return 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200';
    if (statut === 'pret_a_livrer' || statut === 'ready') return 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200';
    if (statut === 'en_livraison' || statut === 'in_delivery') return 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200';
    if (statut === 'livree' || statut === 'delivered') return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    if (statut === 'annulee' || statut === 'cancelled') return 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
  };

  const getStatusText = (status) => {
    // Support des statuts français et anglais
    const statut = status || '';
    if (statut === 'en_attente' || statut === 'pending') return 'En attente';
    if (statut === 'en_preparation' || statut === 'preparing') return 'En préparation';
    if (statut === 'pret_a_livrer' || statut === 'ready') return 'Prêt à livrer';
    if (statut === 'en_livraison' || statut === 'in_delivery') return 'En livraison';
    if (statut === 'livree' || statut === 'delivered') return 'Livré';
    if (statut === 'annulee' || statut === 'cancelled') return 'Annulé';
    return statut;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded relative">
            {error}
          </div>
          <button
            onClick={() => router.push('/profile/orders')}
            className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
          >
            Retour aux commandes
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">Commande non trouvée</p>
            <button
              onClick={() => router.push('/profile/orders')}
              className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors"
            >
              Retour aux commandes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Détails de la commande #{order.id}</h1>
            <button
              onClick={(e) => {
                e.preventDefault();
                router.push('/profile/orders');
              }}
              className="px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center transition-colors font-medium"
            >
              <FaArrowLeft className="mr-2" />
              Retour aux commandes
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                {getStatusText(order.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Restaurant</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {order.restaurant?.name || order.restaurant?.nom || 'Restaurant inconnu'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {order.restaurant?.address || order.restaurant?.adresse || ''}, {order.restaurant?.city || order.restaurant?.ville || ''}
                </p>
              </div>

              <div>
                <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Adresse de livraison</h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {order.deliveryAddress || ''}, {order.deliveryCity || ''} {order.deliveryPostalCode || ''}
                </p>
                <p className="text-gray-600 dark:text-gray-300">Tél: {order.deliveryPhone || 'Non renseigné'}</p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-lg font-medium mb-4 dark:text-gray-100">Items commandés</h2>
              <div className="space-y-4">
                {(order.items || order.details_commande || []).map((item, idx) => {
                  const itemName = item.name || item.nom || item.menus?.nom || 'Article';
                  const itemQuantity = item.quantity || item.quantite || 1;
                  const itemPrice = parseFloat(item.price || item.prix || item.prix_unitaire || item.menus?.prix || 0);
                  const supplements = item.supplements || item.supplements_data || [];
                  const totalItemPrice = itemPrice * itemQuantity;
                  
                  // Calculer le prix des suppléments si présents
                  let supplementsPrice = 0;
                  if (Array.isArray(supplements) && supplements.length > 0) {
                    supplementsPrice = supplements.reduce((sum, sup) => {
                      return sum + (parseFloat(sup.prix || sup.price || 0) || 0);
                    }, 0) * itemQuantity;
                  }
                  
                  return (
                    <div key={item.id || idx} className="flex justify-between items-start border-b dark:border-gray-700 pb-4">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{itemName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quantité: {itemQuantity}</p>
                        {Array.isArray(supplements) && supplements.length > 0 && (
                          <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Suppléments:</span>
                            <ul className="list-disc list-inside ml-2 mt-1">
                              {supplements.map((sup, supIdx) => (
                                <li key={supIdx}>
                                  {sup.nom || sup.name} (+{(sup.prix || sup.price || 0).toFixed(2)}€)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {(totalItemPrice + supplementsPrice).toFixed(2)}€
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t dark:border-gray-700 pt-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <p className="text-gray-600 dark:text-gray-300">Sous-total (articles)</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(() => {
                      // Calculer le sous-total depuis les détails avec suppléments
                      if (order.details_commande && Array.isArray(order.details_commande)) {
                        const subtotal = order.details_commande.reduce((sum, detail) => {
                          const prix = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0;
                          const qty = parseInt(detail.quantite || 1, 10);
                          
                          // Ajouter le prix des suppléments
                          let supplementsPrice = 0;
                          if (detail.supplements && Array.isArray(detail.supplements)) {
                            supplementsPrice = detail.supplements.reduce((supSum, sup) => {
                              return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
                            }, 0);
                          }
                          
                          return sum + ((prix + supplementsPrice) * qty);
                        }, 0);
                        return subtotal.toFixed(2);
                      }
                      // Fallback avec items
                      if (order.items && Array.isArray(order.items)) {
                        const subtotal = order.items.reduce((sum, item) => {
                          const prix = parseFloat(item.price || 0) || 0;
                          const qty = parseInt(item.quantity || 1, 10);
                          return sum + (prix * qty);
                        }, 0);
                        return subtotal.toFixed(2);
                      }
                      // Dernier fallback
                      const subtotal = parseFloat(order.total || 0) - parseFloat(order.frais_livraison || order.deliveryFee || 0);
                      return isNaN(subtotal) ? '0.00' : subtotal.toFixed(2);
                    })()}€
                  </p>
                </div>
                <div className="flex justify-between">
                  <p className="text-gray-600 dark:text-gray-300">Frais de livraison</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {(parseFloat(order.frais_livraison || order.deliveryFee || 0)).toFixed(2)}€
                  </p>
                </div>
                {(order.platform_fee > 0 || order.platformFee > 0) && (
                  <div className="flex justify-between">
                    <p className="text-gray-600 dark:text-gray-300">Frais de plateforme</p>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {(parseFloat(order.platform_fee || order.platformFee || 0)).toFixed(2)}€
                    </p>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-gray-700">
                  <p className="text-gray-900 dark:text-white">Total</p>
                  <p className="text-gray-900 dark:text-white">
                    {(() => {
                      // Utiliser le total réel si disponible, sinon calculer
                      if (order.total !== undefined && order.total > 0) {
                        return parseFloat(order.total || 0).toFixed(2);
                      }
                      // Calculer le total correctement
                      let subtotal = 0;
                      if (order.details_commande && Array.isArray(order.details_commande)) {
                        subtotal = order.details_commande.reduce((sum, detail) => {
                          const prix = parseFloat(detail.prix_unitaire || detail.menus?.prix || 0) || 0;
                          const qty = parseInt(detail.quantite || 1, 10);
                          let supplementsPrice = 0;
                          if (detail.supplements && Array.isArray(detail.supplements)) {
                            supplementsPrice = detail.supplements.reduce((supSum, sup) => {
                              return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
                            }, 0);
                          }
                          return sum + ((prix + supplementsPrice) * qty);
                        }, 0);
                      } else if (order.items && Array.isArray(order.items)) {
                        subtotal = order.items.reduce((sum, item) => {
                          const prix = parseFloat(item.price || 0) || 0;
                          const qty = parseInt(item.quantity || 1, 10);
                          return sum + (prix * qty);
                        }, 0);
                      } else {
                        subtotal = parseFloat(order.total || 0) - parseFloat(order.frais_livraison || order.deliveryFee || 0);
                      }
                      const deliveryFee = parseFloat(order.frais_livraison || order.deliveryFee || 0);
                      const platformFee = parseFloat(order.platform_fee || order.platformFee || 0);
                      const total = subtotal + deliveryFee + platformFee;
                      return isNaN(total) ? '0.00' : total.toFixed(2);
                    })()}€
                  </p>
                </div>
                {/* Afficher les infos de remboursement si la commande a été annulée et remboursée */}
                {order.status === 'annulee' && order.refund_amount && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">
                          ✓ Commande remboursée
                        </p>
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          Montant remboursé: {parseFloat(order.refund_amount || 0).toFixed(2)}€
                        </p>
                        {order.refunded_at && (
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                            Le {new Date(order.refunded_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        )}
                      </div>
                      <div className="text-green-600 dark:text-green-400">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 