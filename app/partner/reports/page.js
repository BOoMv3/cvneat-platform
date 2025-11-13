'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaFileAlt, 
  FaDownload, 
  FaChartBar, 
  FaChartLine,
  FaChartPie,
  FaCalendarAlt,
  FaEuroSign,
  FaShoppingCart,
  FaUtensils
} from 'react-icons/fa';

export default function PartnerReports() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState('orders');
  const [period, setPeriod] = useState('month');
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Autoriser les restaurants ET les admins
      if (userError || !userData || (userData.role !== 'restaurant' && userData.role !== 'admin')) {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const generateReport = async () => {
    if (!restaurant) return;

    setGenerating(true);
    try {
      const response = await fetch(
        `/api/partner/reports?restaurantId=${restaurant.id}&type=${reportType}&period=${period}`
      );
      const data = await response.json();
      if (response.ok) {
        setReportData(data);
      }
    } catch (error) {
      console.error('Erreur génération rapport:', error);
    } finally {
      setGenerating(false);
    }
  };

  const downloadCSV = async () => {
    if (!restaurant) return;

    try {
      const response = await fetch(
        `/api/partner/reports?restaurantId=${restaurant.id}&type=${reportType}&period=${period}&format=csv`
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportType}_report_${period}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erreur téléchargement CSV:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Rapports et Exports</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Contrôles */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Générer un rapport</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type de rapport</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="orders">Commandes</option>
                <option value="revenue">Revenus</option>
                <option value="menu">Performance du menu</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="week">7 derniers jours</option>
                <option value="month">Ce mois</option>
                <option value="year">Cette année</option>
              </select>
            </div>
            
            <div className="flex items-end space-x-3">
              <button
                onClick={generateReport}
                disabled={generating}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Génération...</span>
                  </>
                ) : (
                  <>
                    <FaFileAlt className="h-4 w-4" />
                    <span>Générer</span>
                  </>
                )}
              </button>
              
              {reportData && (
                <button
                  onClick={downloadCSV}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <FaDownload className="h-4 w-4" />
                  <span>CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Affichage du rapport */}
        {reportData && (
          <div className="space-y-6">
            {/* Résumé */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumé</h3>
              
              {reportData.type === 'orders' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalOrders}</div>
                    <div className="text-sm text-gray-600">Total commandes</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData.summary.totalRevenue.toFixed(2)}€</div>
                    <div className="text-sm text-gray-600">Chiffre d'affaires</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData.summary.averageOrderValue.toFixed(2)}€</div>
                    <div className="text-sm text-gray-600">Panier moyen</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{reportData.summary.statusBreakdown.livree}</div>
                    <div className="text-sm text-gray-600">Commandes livrées</div>
                  </div>
                </div>
              )}
              
              {reportData.type === 'revenue' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData.summary.totalRevenue.toFixed(2)}€</div>
                    <div className="text-sm text-gray-600">Revenus totaux</div>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalOrders}</div>
                    <div className="text-sm text-gray-600">Commandes</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData.summary.averageDailyRevenue.toFixed(2)}€</div>
                    <div className="text-sm text-gray-600">Moyenne quotidienne</div>
                  </div>
                </div>
              )}
              
              {reportData.type === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{reportData.summary.totalItems}</div>
                    <div className="text-sm text-gray-600">Plats au menu</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{reportData.summary.availableItems}</div>
                    <div className="text-sm text-gray-600">Plats disponibles</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{reportData.summary.totalRevenue.toFixed(2)}€</div>
                    <div className="text-sm text-gray-600">Revenus menu</div>
                  </div>
                  <div className="text-center p-4 bg-yellow-50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{reportData.summary.mostPopularItem?.nom || 'N/A'}</div>
                    <div className="text-sm text-gray-600">Plat le plus populaire</div>
                  </div>
                </div>
              )}
            </div>

            {/* Détails */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b">
                <h3 className="text-lg font-semibold text-gray-900">Détails</h3>
              </div>
              
              <div className="p-6">
                {reportData.type === 'orders' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">ID</th>
                          <th className="text-left py-2">Date</th>
                          <th className="text-left py-2">Client</th>
                          <th className="text-left py-2">Total</th>
                          <th className="text-left py-2">Statut</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.orders.slice(0, 10).map((order) => (
                          <tr key={order.id} className="border-b">
                            <td className="py-2">{order.id}</td>
                            <td className="py-2">{new Date(order.created_at).toLocaleString('fr-FR')}</td>
                            <td className="py-2">
                              {(order.users?.prenom && order.users?.nom) 
                                ? `${order.users.prenom} ${order.users.nom}`.trim()
                                : order.users?.nom || order.users?.prenom || 'Client'}
                            </td>
                            <td className="py-2">{order.total}€</td>
                            <td className="py-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                order.statut === 'livree' ? 'bg-green-100 text-green-800' :
                                order.statut === 'en_attente' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {order.statut.replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {reportData.type === 'revenue' && (
                  <div className="space-y-4">
                    {reportData.dailyRevenue.map((day, index) => (
                      <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{day.date}</div>
                          <div className="text-sm text-gray-600">{day.orders} commandes</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-600">{day.revenue}€</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {reportData.type === 'menu' && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Plat</th>
                          <th className="text-left py-2">Catégorie</th>
                          <th className="text-left py-2">Prix</th>
                          <th className="text-left py-2">Commandes</th>
                          <th className="text-left py-2">Quantité</th>
                          <th className="text-left py-2">Revenus</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.menuPerformance.map((item) => (
                          <tr key={item.id} className="border-b">
                            <td className="py-2">{item.nom}</td>
                            <td className="py-2">{item.category || '-'}</td>
                            <td className="py-2">{item.prix}€</td>
                            <td className="py-2">{item.totalCommandes}</td>
                            <td className="py-2">{item.totalQuantite}</td>
                            <td className="py-2 font-medium">{item.totalRevenue.toFixed(2)}€</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 