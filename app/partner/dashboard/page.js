'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { FaChartLine, FaBoxOpen, FaFileAlt, FaBell, FaUtensils, FaPlus } from 'react-icons/fa';
import Link from 'next/link';
import AuthGuard from '../../../components/AuthGuard';
import Navbar from '../../../components/Navbar';


export default function PartnerDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push('/login');
          return;
        }

        const token = session.access_token;

        // Fetch stats
        const statsRes = await fetch('/api/partner/dashboard', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!statsRes.ok) throw new Error('Erreur lors du chargement des statistiques.');
        const statsData = await statsRes.json();
        setStats(statsData);

        // Fetch orders (à implémenter)
        // const ordersRes = await fetch('/api/partner/orders', {
        //   headers: { 'Authorization': `Bearer ${token}` }
        // });
        // if (!ordersRes.ok) throw new Error('Erreur lors du chargement des commandes.');
        // const ordersData = await ordersRes.json();
        // setOrders(ordersData);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-red-600">Une erreur est survenue</h2>
          <p className="text-gray-700 mt-2">{error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600">
            Réessayer
          </button>
        </div>
      </div>
    );
  }


  return (
    <AuthGuard allowedRoles={['partner']}>
      <div className="min-h-screen bg-gray-100">
        <Navbar />
        
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold text-gray-900">
              Tableau de bord Partenaire
            </h1>
          </div>
        </header>

        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {/* Statistiques */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard icon={<FaBoxOpen className="text-blue-500" />} title="Commandes du jour" value={stats?.today_orders || 0} />
            <StatCard icon={<FaBell className="text-yellow-500" />} title="Commandes en attente" value={stats?.pending_orders || 0} />
            <StatCard icon={<FaChartLine className="text-green-500" />} title="Revenu total" value={`${(stats?.total_revenue || 0).toFixed(2)}€`} />
            <StatCard icon={<FaFileAlt className="text-purple-500" />} title="Plats au menu" value={"N/A"} />
          </div>

          {/* Actions rapides */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <ActionCard title="Gérer le Menu" description="Ajoutez, modifiez ou supprimez des plats et catégories." link="/restaurant/menu/edit" icon={<FaUtensils />} />
             <ActionCard title="Voir les Commandes" description="Consultez l'historique et le statut de vos commandes." link="/restaurant/orders" icon={<FaBoxOpen />} />
             <ActionCard title="Gérer les Horaires" description="Mettez à jour vos heures d'ouverture et de fermeture." link="/partner/hours" icon={<FaPlus />} />
          </div>

          {/* Commandes récentes (à venir) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">Commandes Récentes</h2>
            <p className="text-gray-500">La liste de vos commandes les plus récentes apparaîtra ici.</p>
            {/* Le code pour lister les commandes ira ici */}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}

const StatCard = ({ icon, title, value }) => (
  <div className="bg-white rounded-lg shadow-sm p-6 flex items-center space-x-4">
    <div className="text-3xl bg-gray-100 p-3 rounded-full">{icon}</div>
    <div>
      <h3 className="text-gray-500 text-sm font-medium">{title}</h3>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const ActionCard = ({ title, description, link, icon }) => (
  <Link href={link} className="block bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow">
    <div className="flex items-center space-x-4 mb-2">
      <div className="text-2xl text-orange-500">{icon}</div>
      <h3 className="text-lg font-bold text-gray-800">{title}</h3>
    </div>
    <p className="text-gray-600">{description}</p>
  </Link>
); 