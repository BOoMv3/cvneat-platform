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
        throw new Error('Failed to fetch orders');
      }
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error(error);
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
              <div key={order.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
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
                  <p className="text-gray-600 dark:text-gray-300">{order.restaurant.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {order.restaurant.address}, {order.restaurant.city}
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

                <div className="flex justify-between items-center border-t dark:border-gray-700 pt-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Sous-total</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{((order.total || 0) - (order.deliveryFee || 0)).toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frais de livraison</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{(parseFloat(order.deliveryFee || 0)).toFixed(2)}€</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
                    <p className="text-lg font-medium text-gray-900 dark:text-white">{(parseFloat(order.total || 0)).toFixed(2)}€</p>
                  </div>
                </div>
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