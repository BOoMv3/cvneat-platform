'use client';
import { useState, useEffect } from 'react';
import AuthGuard from '../../components/AuthGuard';

export default function PartnerDashboard() {
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0
  });

  useEffect(() => {
    // TODO: Récupérer les données depuis l'API
    setOrders([
      { id: 1, customer: "Jean Dupont", items: "2 Pizzas", status: "en attente", time: "12:30" },
      { id: 2, customer: "Marie Martin", items: "1 Burger", status: "en préparation", time: "12:45" }
    ]);

    setMenu([
      { id: 1, name: "Pizza Margherita", price: 12.99, category: "Pizzas", available: true },
      { id: 2, name: "Burger Classic", price: 9.99, category: "Burgers", available: true }
    ]);

    setStats({
      todayOrders: 15,
      pendingOrders: 3,
      totalRevenue: 250.50
    });
  }, []);

  return (
    <AuthGuard requiredRole="partner">
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Tableau de bord partenaire</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Commandes aujourd'hui</h3>
              <p className="text-3xl font-bold">{stats.todayOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Commandes en attente</h3>
              <p className="text-3xl font-bold">{stats.pendingOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Revenus du jour</h3>
              <p className="text-3xl font-bold">{stats.totalRevenue}€</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Commandes en cours</h2>
              <div className="space-y-4">
                {orders.map(order => (
                  <div key={order.id} className="border-b pb-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{order.customer}</p>
                        <p className="text-gray-600">{order.items}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{order.time}</p>
                        <span className={`px-2 py-1 rounded text-sm ${
                          order.status === 'en attente' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Gestion du menu</h2>
              <button className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 mb-4">
                Ajouter un plat
              </button>
              <div className="space-y-4">
                {menu.map(item => (
                  <div key={item.id} className="flex justify-between items-center border-b pb-4">
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-gray-600">{item.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{item.price}€</p>
                      <button className="text-sm text-blue-600 hover:text-blue-800">
                        Modifier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </AuthGuard>
  );
} 