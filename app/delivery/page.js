'use client';
import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';
import Navbar from '@/components/Navbar';

export default function DeliveryDashboard() {
  const [deliveries, setDeliveries] = useState([]);
  const [stats, setStats] = useState({
    todayDeliveries: 0,
    completedDeliveries: 0,
    totalEarnings: 0
  });

  useEffect(() => {
    // TODO: Récupérer les données depuis l'API
    setDeliveries([
      {
        id: 1,
        restaurant: "Le Petit Bistrot",
        customer: "Jean Dupont",
        address: "12 rue de la Paix, Ganges",
        status: "en cours",
        time: "12:30"
      },
      {
        id: 2,
        restaurant: "Pizza Express",
        customer: "Marie Martin",
        address: "8 avenue des Oliviers, Ganges",
        status: "en attente",
        time: "12:45"
      }
    ]);

    setStats({
      todayDeliveries: 8,
      completedDeliveries: 5,
      totalEarnings: 45.50
    });
  }, []);

  return (
    <AuthGuard requiredRole="delivery">
      <Navbar />
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Tableau de bord livreur</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Livraisons aujourd'hui</h3>
              <p className="text-3xl font-bold">{stats.todayDeliveries}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Livraisons terminées</h3>
              <p className="text-3xl font-bold">{stats.completedDeliveries}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Gains du jour</h3>
              <p className="text-3xl font-bold">{stats.totalEarnings}€</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Livraisons en cours</h2>
            <div className="space-y-4">
              {deliveries.map(delivery => (
                <div key={delivery.id} className="border-b pb-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{delivery.restaurant}</p>
                      <p className="text-gray-600">{delivery.customer}</p>
                      <p className="text-sm text-gray-500">{delivery.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">{delivery.time}</p>
                      <span className={`px-2 py-1 rounded text-sm ${
                        delivery.status === 'en attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {delivery.status}
                      </span>
                      {delivery.status === 'en attente' && (
                        <button className="block w-full mt-2 bg-green-600 text-white py-1 px-3 rounded-md hover:bg-green-700 text-sm">
                          Accepter
                        </button>
                      )}
                      {delivery.status === 'en cours' && (
                        <button className="block w-full mt-2 bg-blue-600 text-white py-1 px-3 rounded-md hover:bg-blue-700 text-sm">
                          Marquer comme livré
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
} 