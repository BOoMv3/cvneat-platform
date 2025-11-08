'use client';

import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
// import { fetchWithAuth } from '../../../lib/auth'; // Supprimé car non utilisé

export default function MyOrdersPage() {
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Pas de token d\'authentification');
      }
      
      const response = await fetch('/api/delivery/my-orders', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setMyOrders(data);
        setError(null);
      } else {
        setError(data.error || 'Erreur lors de la récupération des commandes');
      }
    } catch (err) {
      setError('Erreur de connexion');
      console.error('Erreur fetchMyOrders:', err);
    } finally {
      setLoading(false);
    }
  };

  const completeOrder = async (orderId) => {
    try {
      // Récupérer le token d'authentification
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Pas de token d\'authentification');
      }
      
      const response = await fetch(`/api/delivery/complete-delivery/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Recharger les commandes
        await fetchMyOrders();
      } else {
        const data = await response.json();
        alert(data.error || 'Erreur lors de la finalisation');
      }
    } catch (err) {
      console.error('Erreur completeOrder:', err);
      alert('Erreur de connexion');
    }
  };

  useEffect(() => {
    fetchMyOrders();
    
    // Rafraîchir toutes les 5 secondes
    const interval = setInterval(fetchMyOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Mes Commandes</h1>
          <div className="text-center">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Mes Commandes ({myOrders.length})</h1>
          <button
            onClick={fetchMyOrders}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Actualiser
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {myOrders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">Aucune commande en cours</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {myOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Commande #{order.id}</h3>
                    <p className="text-gray-600">{order.restaurant?.nom}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {order.total}€
                    </div>
                    <div className="text-sm text-gray-500">
                      Frais: {order.delivery_fee}€
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <h4 className="font-medium mb-2">Adresse de livraison:</h4>
                  <p className="text-gray-700">{order.delivery_address}</p>
                  <p className="text-sm text-gray-500">
                    {order.delivery_city} {order.delivery_postal_code}
                  </p>
                </div>

              <div className="mb-4">
                <h4 className="font-medium mb-2">Contact client:</h4>
                <p className="text-gray-700">{order.customer_name || 'Client'}</p>
                {order.customer_phone && (
                  <p className="text-sm text-gray-500">📞 {order.customer_phone}</p>
                )}
                {order.customer_email && (
                  <p className="text-sm text-gray-500 break-all">✉️ {order.customer_email}</p>
                )}
              </div>

                {order.delivery_instructions && (
                  <div className="mb-4">
                    <h4 className="font-medium mb-1">Instructions:</h4>
                    <p className="text-gray-700">{order.delivery_instructions}</p>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      order.statut === 'acceptee' || order.statut === 'accepted' ? 'bg-yellow-100 text-yellow-800' :
                      order.statut === 'en_preparation' || order.statut === 'preparing' ? 'bg-orange-100 text-orange-800' :
                      order.statut === 'pret_a_livrer' || order.statut === 'ready' ? 'bg-green-100 text-green-800' :
                      order.statut === 'en_livraison' ? 'bg-blue-100 text-blue-800' :
                      order.statut === 'livree' ? 'bg-gray-100 text-gray-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {order.statut === 'acceptee' || order.statut === 'accepted' ? 'Acceptée' :
                       order.statut === 'en_preparation' || order.statut === 'preparing' ? 'En préparation' :
                       order.statut === 'pret_a_livrer' || order.statut === 'ready' ? 'Prête' : 
                       order.statut === 'en_livraison' ? 'En livraison' :
                       order.statut === 'livree' ? 'Livrée' : order.statut || 'Inconnu'}
                    </span>
                  </div>
                  
                  {(order.statut === 'pret_a_livrer' || order.statut === 'ready' || order.statut === 'en_livraison') && (
                    <button
                      onClick={() => completeOrder(order.id)}
                      className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                    >
                      Marquer comme livrée
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
