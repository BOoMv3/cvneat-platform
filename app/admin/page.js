"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const [orders, setOrders] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const COMMISSION = 0.20; // 20% de commission CVN'EAT
  const router = useRouter();
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      console.log('Session Supabase:', session);
      if (!session?.user) {
        setError('Session utilisateur non trouvée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      const { data: userData, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single();
      console.log('UserData Supabase:', userData, 'Error:', error);
      if (!userData || !userData.role.split(',').includes('admin')) {
        setError(`Accès refusé. Votre rôle est : ${userData ? userData.role : 'aucun'}. Contactez un administrateur.`);
        setLoading(false);
        return;
      }
      setUser(session.user);
      setRole(userData.role);
      setLoading(false);
    };
    checkAdmin();
  }, [router]);

  useEffect(() => {
    // Charger les partenaires à valider
    const fetchPendingPartners = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('status', 'pending');
      if (!error) setPendingPartners(data || []);
    };
    fetchPendingPartners();
  }, [router, refresh]);

  useEffect(() => {
    // Charger toutes les commandes
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('commandes')
        .select('*, users(nom, prenom, email), restaurants(nom)')
        .order('created_at', { ascending: false });
      if (!error) setOrders(data || []);
    };
    fetchOrders();
  }, [router, refresh]);

  useEffect(() => {
    // Charger tous les restaurants
    const fetchAllRestaurants = async () => {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*');
      if (!error) setAllRestaurants(data || []);
    };
    fetchAllRestaurants();
    // Charger toutes les commandes (pour le calcul des commissions)
    const fetchAllOrders = async () => {
      const { data, error } = await supabase
        .from('commandes')
        .select('*');
      if (!error) setAllOrders(data || []);
    };
    fetchAllOrders();
  }, [router, refresh]);

  useEffect(() => {
    // Charger tous les utilisateurs
    const fetchAllUsers = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*');
      if (!error) setAllUsers(data || []);
    };
    fetchAllUsers();
  }, [router, refresh]);

  const handlePartnerStatus = async (id, status) => {
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');
    const { error } = await supabase.from('restaurants').update({ status }).eq('id', id);
    if (error) setActionError(error.message);
    else setActionSuccess('Statut du partenaire mis à jour !');
    setRefresh(r => !r);
    setActionLoading(false);
  };

  const handleRoleChange = async (id, newRole) => {
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');
    
    try {
      // Mettre à jour directement avec le nouveau rôle
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la mise à jour du rôle:', error);
        setActionError(error.message);
      } else {
        setActionSuccess('Rôle utilisateur mis à jour !');
        // Rafraîchir la liste des utilisateurs
        const { data: users, error: fetchError } = await supabase
          .from('users')
          .select('*');
        if (!fetchError) {
          setAllUsers(users);
        }
      }
    } catch (err) {
      console.error('Erreur:', err);
      setActionError('Une erreur est survenue lors de la mise à jour du rôle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBlockUser = async (id, blocked) => {
    setActionLoading(true);
    setActionSuccess('');
    setActionError('');
    const { error } = await supabase.from('users').update({ blocked }).eq('id', id);
    if (error) setActionError(error.message);
    else setActionSuccess(blocked ? 'Utilisateur bloqué.' : 'Utilisateur débloqué.');
    setRefresh(r => !r);
    setActionLoading(false);
  };

  if (error) return (
    <div className="p-8 text-center text-red-600">
      {error}
    </div>
  );

  if (loading) return <div className="p-8 text-center">Chargement...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Feedback global */}
      {actionLoading && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-6 py-2 rounded shadow z-50">Action en cours...</div>}
      {actionSuccess && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-6 py-2 rounded shadow z-50">{actionSuccess}</div>}
      {actionError && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-800 px-6 py-2 rounded shadow z-50">{actionError}</div>}
      <div className="max-w-6xl mx-auto p-8">
        <h1 className="text-3xl font-bold mb-8">Espace Administrateur CVN'EAT</h1>
        <nav className="flex gap-4 mb-8">
          <a href="#partenaires" className="text-blue-600 hover:underline">Partenaires à valider</a>
          <a href="#commandes" className="text-blue-600 hover:underline">Commandes</a>
          <a href="#restaurants" className="text-blue-600 hover:underline">Restaurants</a>
          <a href="#roles" className="text-blue-600 hover:underline">Utilisateurs & rôles</a>
        </nav>
        
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Restaurants</p>
                <p className="text-2xl font-semibold text-gray-900">{allRestaurants.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">En attente</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingPartners.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Commandes</p>
                <p className="text-2xl font-semibold text-gray-900">{allOrders.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-6 border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Commission CVN'EAT</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {(allOrders.reduce((sum, o) => sum + (o.total || 0), 0) * COMMISSION).toFixed(2)} €
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div id="partenaires" className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Partenaires à valider</h2>
          {pendingPartners.length === 0 ? (
            <p className="text-gray-600">Aucun partenaire en attente de validation.</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Nom</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Téléphone</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingPartners.map(partner => (
                  <tr key={partner.id} className="border-t">
                    <td className="p-2">{partner.nom}</td>
                    <td className="p-2">{partner.email}</td>
                    <td className="p-2">{partner.telephone}</td>
                    <td className="p-2 space-x-2">
                      <button onClick={() => handlePartnerStatus(partner.id, 'active')} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600" disabled={actionLoading}>Accepter</button>
                      <button onClick={() => handlePartnerStatus(partner.id, 'inactive')} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" disabled={actionLoading}>Refuser</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div id="commandes" className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Toutes les commandes</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600">Aucune commande trouvée.</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Date</th>
                  <th className="p-2">Client</th>
                  <th className="p-2">Restaurant</th>
                  <th className="p-2">Total</th>
                  <th className="p-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id} className="border-t">
                    <td className="p-2">{new Date(order.created_at).toLocaleString()}</td>
                    <td className="p-2">{order.users?.prenom} {order.users?.nom}<br />{order.users?.email}</td>
                    <td className="p-2">{order.restaurants?.nom}</td>
                    <td className="p-2">{order.total} €</td>
                    <td className="p-2">{order.statut}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div id="restaurants" className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Tous les restaurants</h2>
          {allRestaurants.length === 0 ? (
            <p className="text-gray-600">Aucun restaurant trouvé.</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Nom</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Sponsorisé</th>
                  <th className="p-2">Total généré</th>
                  <th className="p-2">Commission CVNeat</th>
                  <th className="p-2">À reverser au restaurant</th>
                </tr>
              </thead>
              <tbody>
                {allRestaurants.map(resto => {
                  const restoOrders = allOrders.filter(o => o.restaurant_id === resto.id && o.statut === 'livree');
                  const totalGenere = restoOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                  const commission = totalGenere * COMMISSION;
                  const aReverser = totalGenere - commission;
                  const isSponsor = resto.mise_en_avant && resto.mise_en_avant_fin && new Date(resto.mise_en_avant_fin) > new Date();
                  return (
                    <tr key={resto.id} className="border-t">
                      <td className="p-2">{resto.nom}</td>
                      <td className="p-2">{resto.email}</td>
                      <td className="p-2">{resto.status}</td>
                      <td className="p-2">{isSponsor ? <span className="bg-yellow-400 text-white px-2 py-1 rounded-full text-xs font-bold">Sponsorisé</span> : '-'}</td>
                      <td className="p-2">{totalGenere.toFixed(2)} €</td>
                      <td className="p-2">{commission.toFixed(2)} €</td>
                      <td className="p-2">{aReverser.toFixed(2)} €</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <div id="roles" className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Utilisateurs & rôles</h2>
          {allUsers.length === 0 ? (
            <p className="text-gray-600">Aucun utilisateur trouvé.</p>
          ) : (
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Nom</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Rôle</th>
                  <th className="p-2">Statut</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map(user => (
                  <tr key={user.id} className="border-t">
                    <td className="p-2">{user.prenom} {user.nom}</td>
                    <td className="p-2">{user.email}</td>
                    <td className="p-2">
                      <select value={user.role} onChange={e => handleRoleChange(user.id, e.target.value)} className="input-primary">
                        <option value="user">Client</option>
                        <option value="restaurant">Partenaire</option>
                        <option value="delivery">Livreur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="p-2">{user.blocked ? <span className="text-red-600">Bloqué</span> : <span className="text-green-600">Actif</span>}</td>
                    <td className="p-2 space-x-2">
                      {user.blocked ? (
                        <button onClick={() => handleBlockUser(user.id, false)} className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600" disabled={actionLoading}>Débloquer</button>
                      ) : (
                        <button onClick={() => handleBlockUser(user.id, true)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" disabled={actionLoading}>Bloquer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
} 