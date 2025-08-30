"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    users: 0,
    restaurants: 0,
    orders: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupération sécurisée des données avec gestion d'erreur
      let usersCount = 0;
      let restaurantsCount = 0;
      let ordersCount = 0;

      try {
        const { data: usersData, error: usersError } = await supabase
          .from('users')
          .select('id')
          .limit(1000);
        
        if (!usersError && usersData) {
          usersCount = usersData.length;
        }
      } catch (e) {
        console.log('Erreur users:', e);
      }

      try {
        const { data: restaurantsData, error: restaurantsError } = await supabase
          .from('restaurants')
          .select('id')
          .limit(1000);
        
        if (!restaurantsError && restaurantsData) {
          restaurantsCount = restaurantsData.length;
        }
      } catch (e) {
        console.log('Erreur restaurants:', e);
      }

      try {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id')
          .limit(1000);
        
        if (!ordersError && ordersData) {
          ordersCount = ordersData.length;
        }
      } catch (e) {
        console.log('Erreur orders:', e);
      }

      setStats({
        users: usersCount,
        restaurants: restaurantsCount,
        orders: ordersCount
      });

    } catch (error) {
      console.error('Erreur générale:', error);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du dashboard admin...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-8">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <strong>Erreur :</strong> {error}
            </div>
            <button 
              onClick={fetchData}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4">
        {/* En-tête */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dashboard Administrateur
          </h1>
          <p className="text-gray-600">
            Gestion globale de la plateforme CVN'EAT
          </p>
        </div>

        {/* Bouton retour */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            ← Retour à l'accueil
          </button>
        </div>

        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Utilisateurs</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.users}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Restaurants</h3>
            <p className="text-3xl font-bold text-green-600">{stats.restaurants}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Total Commandes</h3>
            <p className="text-3xl font-bold text-purple-600">{stats.orders}</p>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Actions Rapides</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="font-semibold">Gérer Utilisateurs</div>
              </div>
            </button>
            <button className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🏪</div>
                <div className="font-semibold">Gérer Restaurants</div>
              </div>
            </button>
            <button className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📦</div>
                <div className="font-semibold">Gérer Commandes</div>
              </div>
            </button>
            <button className="bg-orange-600 text-white p-4 rounded-lg hover:bg-orange-700 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-semibold">Paramètres</div>
              </div>
            </button>
          </div>
        </div>

        {/* Informations système */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations Système</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Version :</strong> CVN'EAT v1.0
            </div>
            <div>
              <strong>Statut :</strong> <span className="text-green-600">● Opérationnel</span>
            </div>
            <div>
              <strong>Base de données :</strong> Supabase
            </div>
            <div>
              <strong>Framework :</strong> Next.js 14
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 