"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaHome } from 'react-icons/fa';
import { FaUsers, FaStore, FaShoppingCart, FaTruck } from 'react-icons/fa';

// 🚨 FORCAGE REDEPLOIEMENT COMPLET - Page admin COMPLÈTEMENT NOUVELLE
// 🎯 PROBLÈME : Le serveur en ligne a un cache corrompu !
// 🔥 SOLUTION : Changer TOUTE la structure de la page !
export default function AdminDashboardForceDeploy() {
  const router = useRouter();
  const [allUsers, setAllUsers] = useState([]);
  const [allRestaurants, setAllRestaurants] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [pendingPartners, setPendingPartners] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  const COMMISSION = 0.20; // 20% de commission CVN'EAT

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // 🚨 FORCAGE REDEPLOIEMENT - Cette page DOIT être recompilée !
      console.log('🚨 FORCAGE REDEPLOIEMENT - Page admin COMPLÈTEMENT NOUVELLE');
      
      // Récupérer tous les utilisateurs
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Erreur lors de la récupération des utilisateurs:', usersError);
        return;
      }

      // Récupérer tous les restaurants
      const { data: restaurants, error: restaurantsError } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false });

      if (restaurantsError) {
        console.error('Erreur lors de la récupération des restaurants:', restaurantsError);
        return;
      }

      // Récupérer toutes les commandes
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Erreur lors de la récupération des commandes:', ordersError);
        return;
      }

      // Filtrer les partenaires en attente
      const pending = users.filter(user => 
        user.role === 'restaurant' && 
        user.restaurant_id && 
        !restaurants.find(r => r.id === user.restaurant_id)?.is_approved
      );

      setAllUsers(users || []);
      setAllRestaurants(restaurants || []);
      setAllOrders(orders || []);
      setPendingPartners(pending);
    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
    }
  };

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

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      // Si le rôle devient 'restaurant', créer un restaurant par défaut
      if (newRole === 'restaurant') {
        const user = allUsers.find(u => u.id === userId);
        if (user) {
          const { error: restoError } = await supabase
            .from('restaurants')
            .insert({
              user_id: userId,
              nom: `${user.prenom} ${user.nom}`,
              description: 'Restaurant créé automatiquement',
              type_cuisine: 'À définir',
              telephone: user.telephone || 'Téléphone à définir',
              adresse: user.adresse || 'Adresse à définir',
              code_postal: user.code_postal || '34000',
              ville: user.ville || 'Ville à définir',
              email: user.email,
              status: 'active',
              horaires: {
                lundi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                mardi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                mercredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                jeudi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                vendredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                samedi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
                dimanche: { ouvert: false }
              }
            });

          if (restoError) {
            console.error('Erreur création restaurant:', restoError);
          }
        }
      }

      await fetchData();
      setActionSuccess('Rôle mis à jour avec succès');
    } catch (error) {
      console.error('Erreur mise à jour rôle:', error);
      setActionError('Erreur lors de la mise à jour du rôle');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateRestaurant = async (userId) => {
    setActionLoading(true);
    try {
      const user = allUsers.find(u => u.id === userId);
      if (!user) throw new Error('Utilisateur non trouvé');

      // Créer un restaurant avec toutes les colonnes obligatoires
      const { error } = await supabase
        .from('restaurants')
        .insert({
          user_id: userId,
          nom: `${user.prenom} ${user.nom}`,
          description: 'Restaurant créé automatiquement',
          type_cuisine: 'À définir',
          telephone: user.telephone || 'Téléphone à définir',
          adresse: user.adresse || 'Adresse à définir',
          code_postal: user.code_postal || '34000',
          ville: user.ville || 'Ville à définir',
          email: user.email,
          status: 'active',
          horaires: {
            lundi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            mardi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            mercredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            jeudi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            vendredi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            samedi: { ouvert: true, ouverture: '09:00', fermeture: '22:00' },
            dimanche: { ouvert: false }
          }
        });

      if (error) throw error;

      await fetchData();
      setActionSuccess('Restaurant créé avec succès');
    } catch (error) {
      console.error('Erreur création restaurant:', error);
      setActionError('Erreur lors de la création du restaurant: ' + error.message);
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
      {/* 🚨 MESSAGE D'ALERTE POUR FORCER LE REDEPLOIEMENT */}
      <div className="bg-red-600 text-white p-6 text-center font-bold text-xl">
        🚨 ATTENTION : FORCAGE REDEPLOIEMENT COMPLET - Page admin COMPLÈTEMENT NOUVELLE !
      </div>
      
      {actionLoading && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-blue-100 text-blue-800 px-6 py-2 rounded shadow z-50">Action en cours...</div>}
      {actionSuccess && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-green-100 text-green-800 px-6 py-2 rounded shadow z-50">{actionSuccess}</div>}
      {actionError && <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-100 text-red-800 px-6 py-2 rounded shadow z-50">{actionError}</div>}
      <div className="max-w-6xl mx-auto p-3 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white p-3 sm:p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
              title="Retour à l'accueil"
            >
              <FaHome className="h-6 w-6 sm:h-5 sm:w-5" />
              <span className="text-base sm:text-sm font-medium">Accueil</span>
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">🚨 FORCAGE REDEPLOIEMENT - Page Admin COMPLÈTEMENT NOUVELLE</h1>
              <p className="text-sm text-gray-600 mt-2">🔥 Cette page a été FORCÉE à se redéployer avec les cards responsives !</p>
            </div>
          </div>
        </div>
        
        <nav className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <a href="#partenaires" className="text-blue-600 hover:underline text-sm sm:text-base px-3 py-3 sm:py-2 rounded bg-blue-50 hover:bg-blue-100 text-center font-medium">Partenaires</a>
          <a href="#commandes" className="text-blue-600 hover:underline text-sm sm:text-base px-3 py-3 sm:py-2 rounded bg-blue-50 hover:bg-blue-100 text-center font-medium">Commandes</a>
          <a href="#restaurants" className="text-blue-600 hover:underline text-sm sm:text-base px-3 py-3 sm:py-2 rounded bg-blue-50 hover:bg-blue-100 text-center font-medium">Restaurants</a>
          <a href="#roles" className="text-blue-600 hover:underline text-sm sm:text-base px-3 py-3 sm:py-2 rounded bg-blue-50 hover:bg-blue-100 text-center font-medium">Utilisateurs</a>
        </nav>
        
        {/* Statistiques globales */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-blue-100">
                <FaUsers className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-sm sm:text-base font-medium text-gray-600">Total utilisateurs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{allUsers.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-green-100">
                <FaStore className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-sm sm:text-base font-medium text-gray-600">Restaurants</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{allRestaurants.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-purple-100">
                <FaShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-sm sm:text-base font-medium text-gray-600">Commandes</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{allOrders.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex items-center">
              <div className="p-2 sm:p-3 rounded-full bg-orange-100">
                <FaTruck className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-sm sm:text-base font-medium text-gray-600">Livreurs</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{allUsers.filter(u => u.role === 'delivery').length}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Section Partenaires à valider */}
        <section id="partenaires" className="mb-8">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Partenaires à valider</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-lg shadow-md">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Restaurant</th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {pendingPartners.map((partner) => (
                  <tr key={partner.id} className="hover:bg-gray-50">
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-gray-900">{partner.nom}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-gray-500">{partner.email}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base text-gray-500">{partner.nom_restaurant}</td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm sm:text-base font-medium">
                      <button
                        onClick={() => handleApprovePartner(partner.id)}
                        className="text-green-600 hover:text-green-900 mr-2"
                      >
                        ✅ Approuver
                      </button>
                      <button
                        onClick={() => handleRejectPartner(partner.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        ❌ Rejeter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <div id="commandes" className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Toutes les commandes</h2>
          {orders.length === 0 ? (
            <p className="text-gray-600">Aucune commande trouvée.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-blue-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Date</p>
                      <p className="text-sm font-semibold">{new Date(order.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Client</p>
                      <p className="text-sm font-semibold">{order.users?.prenom} {order.users?.nom}</p>
                      <p className="text-xs text-gray-400">{order.users?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Restaurant</p>
                      <p className="text-sm font-semibold">{order.restaurants?.nom}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Total</p>
                      <p className="text-lg font-bold text-green-600">{order.total} €</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Statut</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                        order.statut === 'livree' ? 'bg-green-100 text-green-800' :
                        order.statut === 'en_cours' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.statut}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div id="restaurants" className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Tous les restaurants</h2>
          {allRestaurants.length === 0 ? (
            <p className="text-gray-600">Aucun restaurant trouvé.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {allRestaurants.map(resto => {
                const restoOrders = allOrders.filter(o => o.restaurant_id === resto.id && o.statut === 'livree');
                const totalGenere = restoOrders.reduce((sum, o) => sum + (o.total || 0), 0);
                const commission = totalGenere * COMMISSION;
                const aReverser = totalGenere - commission;
                const isSponsor = resto.mise_en_avant && resto.mise_en_avant_fin && new Date(resto.mise_en_avant_fin) > new Date();
                return (
                  <div key={resto.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-green-500">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Nom</p>
                        <p className="text-lg font-bold text-gray-900">{resto.nom}</p>
                        <p className="text-sm text-gray-600">{resto.email}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Statut</p>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${
                          resto.status === 'active' ? 'bg-green-100 text-green-800' :
                          resto.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {resto.status}
                        </span>
                        {isSponsor && (
                          <span className="ml-2 inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                            Sponsorisé
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Total généré</p>
                        <p className="text-lg font-bold text-green-600">{totalGenere.toFixed(2)} €</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">Commission</p>
                        <p className="text-sm font-bold text-purple-600">{commission.toFixed(2)} €</p>
                        <p className="text-xs text-gray-500">À reverser: {aReverser.toFixed(2)} €</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div id="roles" className="mb-12">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Utilisateurs & rôles</h2>
          {allUsers.length === 0 ? (
            <p className="text-gray-600">Aucun utilisateur trouvé.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {allUsers.map(user => (
                <div key={user.id} className="bg-white rounded-lg shadow-md p-4 border-l-4 border-purple-500">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Nom</p>
                      <p className="text-lg font-bold text-gray-900">{user.prenom} {user.nom}</p>
                      <p className="text-sm text-gray-600">{user.email}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Rôle</p>
                      <select 
                        value={user.role} 
                        onChange={e => handleRoleChange(user.id, e.target.value)} 
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="user">Client</option>
                        <option value="restaurant">Partenaire</option>
                        <option value="delivery">Livreur</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase">Statut</p>
                      {user.blocked ? 
                        <span className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-bold">Bloqué</span> : 
                        <span className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold">Actif</span>
                      }
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Actions</p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => handleBlockUser(user.id, !user.blocked)}
                          className={`px-3 py-2 rounded text-sm font-medium ${
                            user.blocked 
                              ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {user.blocked ? 'Débloquer' : 'Bloquer'}
                        </button>
                        {user.role === 'restaurant' && (
                          <button
                            onClick={() => handleCreateRestaurant(user.id)}
                            className="bg-blue-100 text-blue-800 hover:bg-blue-200 px-3 py-2 rounded text-sm font-medium"
                          >
                            Créer resto
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 