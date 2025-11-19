'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import { supabase } from '../../../lib/supabase';

export default function UserOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUserAndFetchOrders = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        fetchOrders();
    };
    checkUserAndFetchOrders();
  }, [router]);
  
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

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth('/api/orders');
      if (!response.ok) {
        throw new Error('Impossible de récupérer les commandes');
      }
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      // Erreur silencieuse - l'utilisateur verra "Aucune commande trouvée"
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
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black dark:border-white"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Historique des commandes</h1>
            <button
              onClick={() => router.push('/profile')}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white flex items-center"
            >
              <FaArrowLeft className="mr-2" />
              Retour au profil
            </button>
          </div>

          <div className="space-y-4">
            {orders.map((order) => (
              <div 
                key={order.id} 
                onClick={() => router.push(`/profile/orders/${order.id}`)}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Commande #{order.id}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Restaurant</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {order.restaurant?.name || order.restaurant?.nom || 'Restaurant inconnu'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.restaurant?.address || order.restaurant?.adresse || ''}, {order.restaurant?.city || order.restaurant?.ville || ''}
                  </p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Adresse de livraison</h4>
                  <p className="text-gray-600 dark:text-gray-300">
                    {order.deliveryAddress}, {order.deliveryCity} {order.deliveryPostalCode}
                  </p>
                  <p className="text-gray-600 dark:text-gray-300">Tél: {order.deliveryPhone}</p>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Items commandés</h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-gray-900 dark:text-white">{item.quantity}x {item.name}</span>
                        <span className="text-gray-900 dark:text-white">{item.price}€</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 border-t dark:border-gray-700 pt-4">
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sous-total</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {(() => {
                        // Utiliser le subtotal calculé si disponible, sinon calculer depuis items
                        if (order.subtotal !== undefined) {
                          return parseFloat(order.subtotal || 0).toFixed(2);
                        }
                        // Fallback : calculer depuis les items
                        const items = order.items || [];
                        const subtotal = items.reduce((sum, item) => {
                          const price = parseFloat(item.price || 0) || 0;
                          const quantity = parseFloat(item.quantity || 0) || 0;
                          // Ajouter les suppléments si présents
                          let supplementsPrice = 0;
                          if (item.supplements && Array.isArray(item.supplements)) {
                            supplementsPrice = item.supplements.reduce((supSum, sup) => {
                              return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
                            }, 0);
                          }
                          return sum + ((price + supplementsPrice) * quantity);
                        }, 0);
                        return subtotal.toFixed(2);
                      })()}€
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frais de livraison</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{(parseFloat(order.deliveryFee || 0)).toFixed(2)}€</p>
                  </div>
                  {order.platformFee > 0 && (
                    <div className="flex justify-between">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Frais de plateforme</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{(parseFloat(order.platformFee || 0)).toFixed(2)}€</p>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t dark:border-gray-700">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Total</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">
                      {(() => {
                        // Utiliser le total réel si disponible, sinon calculer
                        if (order.total !== undefined && order.total > 0) {
                          return parseFloat(order.total || 0).toFixed(2);
                        }
                        // Fallback : calculer depuis les items
                        const items = order.items || [];
                        const subtotal = items.reduce((sum, item) => {
                          const price = parseFloat(item.price || 0) || 0;
                          const quantity = parseFloat(item.quantity || 0) || 0;
                          let supplementsPrice = 0;
                          if (item.supplements && Array.isArray(item.supplements)) {
                            supplementsPrice = item.supplements.reduce((supSum, sup) => {
                              return supSum + (parseFloat(sup.prix || sup.price || 0) || 0);
                            }, 0);
                          }
                          return sum + ((price + supplementsPrice) * quantity);
                        }, 0);
                        const deliveryFee = parseFloat(order.deliveryFee || 0);
                        const platformFee = parseFloat(order.platformFee || 0);
                        return (subtotal + deliveryFee + platformFee).toFixed(2);
                      })()}€
                    </p>
                  </div>
                </div>
                
                {/* Afficher les infos de remboursement si la commande a été annulée et remboursée */}
                {(order.status === 'annulee' || order.status === 'cancelled') && order.refund_amount && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <p className="text-xs text-green-600 dark:text-green-500 mt-1">
                          Le remboursement apparaîtra sur votre compte bancaire dans 2-5 jours ouvrables.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {orders.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">Aucune commande trouvée</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 