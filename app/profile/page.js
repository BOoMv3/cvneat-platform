'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaShoppingBag, FaMapMarkerAlt, FaStar, FaClock, FaMotorcycle, FaSignOutAlt, FaUser, FaGift, FaHeart, FaEdit, FaCog, FaArrowLeft, FaHome, FaImage, FaBug, FaTicketAlt } from 'react-icons/fa';
import LoyaltyProgram from '../components/LoyaltyProgram';
import PushNotificationService from '../components/PushNotificationService';
import PageHeader from '@/components/PageHeader';
import DarkModeToggle from '@/components/DarkModeToggle';
import TestComponent from '../components/TestComponent';
import NotificationToggle from '@/components/NotificationToggle';

export default function Profile() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [success, setSuccess] = useState(null);
  const [addressForm, setAddressForm] = useState({ name: '', address: '', city: '', postalCode: '', instructions: '' });
  const [editAddressId, setEditAddressId] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [wheelWins, setWheelWins] = useState([]);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authChecked && user) {
      fetchData();
    }
  }, [activeTab, authChecked, user]);

  // Charger les préférences sauvegardées
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedEmailNotifications = localStorage.getItem('email-notifications');
        const savedPushNotifications = localStorage.getItem('push-notifications');
        
        if (savedEmailNotifications !== null) {
          setEmailNotifications(savedEmailNotifications === 'true');
        }
        
        if (savedPushNotifications !== null) {
          setPushNotifications(savedPushNotifications === 'true');
        }
      } catch (error) {
        console.error('Erreur lors du chargement des préférences:', error);
      }
    }
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login?redirect=/profile');
        return;
      }
      setAuthChecked(true);
      await fetchUserData(session.access_token);
    } catch (err) {
      console.error('Erreur lors de la vérification de l\'authentification:', err);
      router.push('/login?redirect=/profile');
    }
  };

  const fetchUserData = async (token) => {
    try {
      const userResponse = await fetch('/api/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!userResponse.ok) throw new Error('Erreur lors de la récupération de l\'utilisateur');
      const userData = await userResponse.json();
      // S'assurer que les champs nom, prenom, phone sont bien initialisés
      setUser({
        ...userData,
        nom: userData.nom || '',
        prenom: userData.prenom || '',
        phone: userData.phone || ''
      });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expirée, veuillez vous reconnecter');
        setLoading(false);
        return;
      }

      if (activeTab === 'orders') {
        const response = await fetch('/api/orders', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (!response.ok) throw new Error('Erreur lors de la récupération des commandes');
        const data = await response.json();
        setOrders(data);
      } else if (activeTab === 'gains') {
        // Récupérer TOUS les gains de la roue (actifs, utilisés et expirés)
        const { data: wins, error: winsError } = await supabase
          .from('wheel_wins')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (winsError) throw winsError;
        setWheelWins(wins || []);
      } else {
        const response = await fetch('/api/users/addresses', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (!response.ok) throw new Error('Erreur lors de la récupération des adresses');
        const data = await response.json();
        setAddresses(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      preparing: 'bg-purple-100 text-purple-800',
      ready: 'bg-indigo-100 text-indigo-800',
      delivering: 'bg-orange-100 text-orange-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'En attente',
      confirmed: 'Confirmée',
      preparing: 'En préparation',
      ready: 'Prête',
      delivering: 'En livraison',
      delivered: 'Livrée',
      cancelled: 'Annulée'
    };
    return texts[status] || status;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleEmailNotificationChange = async (enabled) => {
    setEmailNotifications(enabled);
    // Sauvegarder en localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('email-notifications', enabled.toString());
      }
      console.log('Email notifications:', enabled ? 'activées' : 'désactivées');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la préférence:', error);
    }
  };

  const handlePushNotificationChange = async (enabled) => {
    setPushNotifications(enabled);
    // Sauvegarder en localStorage
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('push-notifications', enabled.toString());
      }
      console.log('Push notifications:', enabled ? 'activées' : 'désactivées');
    } catch (error) {
      console.error('Erreur lors de la gestion des notifications push:', error);
    }
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expirée, veuillez vous reconnecter');
        return;
      }

      const method = editAddressId ? 'PUT' : 'POST';
      const url = editAddressId ? `/api/users/addresses/${editAddressId}` : '/api/users/addresses';
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addressForm)
      });
      if (!response.ok) throw new Error('Erreur lors de la sauvegarde de l\'adresse');
      setSuccess(editAddressId ? 'Adresse modifiée !' : 'Adresse ajoutée !');
      setAddressForm({ name: '', address: '', city: '', postalCode: '', instructions: '' });
      setEditAddressId(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditAddress = (address) => {
    setAddressForm({
      name: address.name,
      address: address.address,
      city: address.city,
      postalCode: address.postalCode,
      instructions: address.instructions || ''
    });
    setEditAddressId(address.id);
  };

  const handleDeleteAddress = async (id) => {
    setError(null);
    setSuccess(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Session expirée, veuillez vous reconnecter');
        return;
      }

      const response = await fetch(`/api/users/addresses/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      if (!response.ok) throw new Error('Erreur lors de la suppression de l\'adresse');
      setSuccess('Adresse supprimée !');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Affichage de chargement initial
  if (!authChecked || loading) {
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

  // Affichage d'erreur d'authentification
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 p-8 rounded shadow text-center">
              <p className="text-red-600 dark:text-red-400 font-bold">Utilisateur non trouvé ou non connecté.</p>
              <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Se connecter</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <PageHeader 
        title="Mon Profil" 
        icon={FaUser}
        showBackButton={false}
        rightContent={
          <button
            onClick={handleLogout}
            className="flex items-center space-x-1 sm:space-x-2 bg-red-600 text-white px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            <FaSignOutAlt className="text-xs sm:text-sm" />
            <span className="hidden xs:inline text-xs sm:text-sm">Déconnexion</span>
          </button>
        }
      />

      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-gray-100">Mon profil</h1>
          </div>

          {/* Formulaire de modification des infos utilisateur */}
          <section className="mb-8 sm:mb-12">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">Mes informations</h2>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoading(true);
                setError(null);
                try {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    setError('Session expirée, veuillez vous reconnecter');
                    setLoading(false);
                    return;
                  }

                  const response = await fetch('/api/users/profile', {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      name: user.name,
                      email: user.email,
                      phone: user.phone,
                    })
                  });
                  if (!response.ok) throw new Error('Erreur lors de la mise à jour du profil');
                  setSuccess('Profil mis à jour !');
                } catch (err) {
                  setError(err.message);
                } finally {
                  setLoading(false);
                }
              }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-800 p-4 rounded shadow mb-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prénom</label>
                <input
                  type="text"
                  value={user.prenom || ''}
                  onChange={e => setUser(u => ({ ...u, prenom: e.target.value }))}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom</label>
                <input
                  type="text"
                  value={user.nom || ''}
                  onChange={e => setUser(u => ({ ...u, nom: e.target.value }))}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
                <input
                  type="email"
                  value={user.email || ''}
                  onChange={e => setUser(u => ({ ...u, email: e.target.value }))}
                  className="input-primary"
                  required
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Téléphone</label>
                <input
                  type="text"
                  value={user.phone || ''}
                  onChange={e => setUser(u => ({ ...u, phone: e.target.value }))}
                  className="input-primary"
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
                  disabled={loading}
                >
                  Sauvegarder
                </button>
              </div>
              {error && <div className="col-span-2 p-2 bg-red-100 text-red-700 rounded mt-2">{error}</div>}
              {success && <div className="col-span-2 p-2 bg-green-100 text-green-700 rounded mt-2">{success}</div>}
            </form>
          </section>

          {/* Onglets - Version mobile optimisée */}
          <div className="grid grid-cols-2 gap-1 mb-4 sm:mb-8 sm:flex sm:flex-wrap sm:gap-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'orders'
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FaShoppingBag className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Mes commandes</span>
              <span className="xs:hidden">Commandes</span>
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'addresses'
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FaMapMarkerAlt className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Mes adresses</span>
              <span className="xs:hidden">Adresses</span>
            </button>
            <button
              onClick={() => setActiveTab('favorites')}
              className={`px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'favorites'
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FaHeart className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Mes favoris</span>
              <span className="xs:hidden">Favoris</span>
            </button>
            <button
              onClick={() => setActiveTab('gains')}
              className={`px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'gains'
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FaTicketAlt className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Mes gains</span>
              <span className="xs:hidden">Gains</span>
            </button>
            <button
              onClick={() => router.push('/profile/advertising')}
              className="px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600"
            >
              <FaImage className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Mes publicités</span>
              <span className="xs:hidden">Pub</span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-2 py-2 rounded-lg min-h-[44px] touch-manipulation text-xs sm:text-sm flex items-center justify-center ${
                activeTab === 'settings'
                  ? 'bg-black text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
              }`}
            >
              <FaCog className="inline-block mr-1 text-xs" />
              <span className="hidden xs:inline">Paramètres</span>
              <span className="xs:hidden">Réglages</span>
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {/* Contenu des onglets */}
          {activeTab === 'orders' && (
            <div className="space-y-4 sm:space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Vous n'avez pas encore de commandes</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/profile/orders/${order.id}`)}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow min-h-[44px] touch-manipulation"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold truncate">{order.restaurantName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.status || order.statut)}`}>
                        {getStatusText(order.status || order.statut)}
                      </span>
                    </div>

                    <div className="space-y-1 sm:space-y-2 mb-3 sm:mb-4">
                      {order.items.slice(0, 2).map((item) => (
                        <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                          <span className="truncate flex-1 min-w-0">{item.quantity}x {item.name}</span>
                          <span className="ml-2">{item.price.toFixed(2)}€</span>
                        </div>
                      ))}
                      {order.items.length > 2 && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          +{order.items.length - 2} autres articles
                        </p>
                      )}
                    </div>

                    <div className="border-t pt-3 sm:pt-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                        <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <p>Adresse de livraison</p>
                          <p className="truncate">{order.deliveryAddress}</p>
                          <p>{order.deliveryCity}, {order.deliveryPostalCode}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-medium text-sm sm:text-base text-gray-900 dark:text-white">Total</p>
                          <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                            {(() => {
                              // IMPORTANT: Utiliser frais_livraison en priorité (nom de colonne BDD)
                              const deliveryFee = parseFloat(order.frais_livraison || order.deliveryFee || 0);
                              // Assurer que le total inclut bien les frais de livraison
                              const subtotal = parseFloat(order.total || 0) - deliveryFee;
                              const total = subtotal + deliveryFee;
                              return total.toFixed(2);
                            })()}€
                          </p>
                          {(order.frais_livraison || order.deliveryFee || 0) > 0 && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              (dont {(parseFloat(order.frais_livraison || order.deliveryFee || 0)).toFixed(2)}€ de frais)
                            </p>
                          )}
                          {/* Afficher les infos de remboursement si la commande a été annulée et remboursée */}
                          {order.status === 'annulee' && order.refund_amount && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                              ✓ Remboursé: {parseFloat(order.refund_amount || 0).toFixed(2)}€
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/track-order?orderId=${order.id}`);
                          }}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center space-x-2 min-h-[40px]"
                        >
                          <FaMotorcycle className="w-4 h-4" />
                          <span>Suivre la commande</span>
                        </button>
                      </div>
                      
                      {/* Bouton signaler un problème pour les commandes livrées */}
                      {(order.status === 'delivered' || order.status === 'livree' || order.statut === 'livree' || order.statut === 'delivered') && (
                        <div className="mt-3 pt-3 border-t">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/complaint/${order.id}`);
                            }}
                            className="w-full bg-orange-100 hover:bg-orange-200 text-orange-800 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                          >
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            Signaler un problème
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Onglet Adresses */}
          {activeTab === 'addresses' && (
            <div className="space-y-4 sm:space-y-6">
              <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-white dark:bg-gray-800 p-4 sm:p-6 rounded shadow mb-4 sm:mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Nom</label>
                  <input type="text" value={addressForm.name} onChange={e => setAddressForm(f => ({ ...f, name: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Adresse</label>
                  <input type="text" value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Ville</label>
                  <input type="text" value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Code postal</label>
                  <input type="text" value={addressForm.postalCode} onChange={e => setAddressForm(f => ({ ...f, postalCode: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Instructions (optionnel)</label>
                  <input type="text" value={addressForm.instructions} onChange={e => setAddressForm(f => ({ ...f, instructions: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded hover:bg-blue-700 min-h-[44px] touch-manipulation text-sm sm:text-base" disabled={loading}>
                    {editAddressId ? 'Modifier' : 'Ajouter'}
                  </button>
                  {editAddressId && (
                    <button type="button" onClick={() => { setAddressForm({ name: '', address: '', city: '', postalCode: '', instructions: '' }); setEditAddressId(null); }} className="bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 sm:px-6 py-2 rounded min-h-[44px] touch-manipulation text-sm sm:text-base">Annuler</button>
                  )}
                </div>
                {error && <div className="col-span-2 p-2 bg-red-100 text-red-700 rounded mt-2">{error}</div>}
                {success && <div className="col-span-2 p-2 bg-green-100 text-green-700 rounded mt-2">{success}</div>}
              </form>
              {addresses.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Vous n'avez pas encore d'adresses</p>
                </div>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 truncate text-gray-900 dark:text-white">{address.name}</h3>
                      <p className="text-sm sm:text-base truncate text-gray-900 dark:text-white">{address.address}</p>
                      <p className="text-sm sm:text-base text-gray-900 dark:text-white">{address.city}, {address.postalCode}</p>
                      {address.instructions && (
                        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1 sm:mt-2">Instructions : {address.instructions}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <button onClick={() => handleEditAddress(address)} className="px-3 py-2 bg-yellow-400 text-white rounded min-h-[44px] touch-manipulation text-sm">Modifier</button>
                      <button onClick={() => handleDeleteAddress(address.id)} className="px-3 py-2 bg-red-500 text-white rounded min-h-[44px] touch-manipulation text-sm">Supprimer</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Onglet Favoris */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="text-center py-8">
                <FaHeart className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Mes Favoris</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">Retrouvez vos restaurants préférés</p>
                <button
                  onClick={() => router.push('/favorites')}
                  className="bg-orange-500 text-white px-6 py-3 rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Voir mes favoris
                </button>
              </div>
            </div>
          )}

          {/* Onglet Mes gains */}
          {activeTab === 'gains' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 sm:p-6 text-white mb-4 sm:mb-6">
                <h2 className="text-xl sm:text-2xl font-bold mb-2">🎰 Mes gains de la roue</h2>
                <p className="text-sm sm:text-base opacity-90">
                  Utilisez vos codes promo lors de votre prochaine commande !
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-500 dark:text-gray-400">Chargement...</p>
                </div>
              ) : wheelWins.length === 0 ? (
                <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                  <FaTicketAlt className="text-4xl text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Aucun gain</h3>
                  <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">
                    Tournez la roue après votre prochaine commande pour gagner des réductions !
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200 font-semibold">
                      {wheelWins.filter(w => new Date(w.valid_until) > new Date() && !w.used_at).length} gain(s) actif(s) sur {wheelWins.length} total
                    </p>
                  </div>
                  <div className="space-y-4">
                    {wheelWins.map((win) => {
                  const isValid = new Date(win.valid_until) > new Date();
                  const isUsed = win.used_at !== null;
                  
                  return (
                    <div
                      key={win.id}
                      className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6 border-2 ${
                        isValid && !isUsed
                          ? 'border-green-500 dark:border-green-400'
                          : 'border-gray-300 dark:border-gray-600 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <FaGift className={`h-5 w-5 ${
                              isValid && !isUsed
                                ? 'text-green-500'
                                : 'text-gray-400'
                            }`} />
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                              {win.description}
                            </h3>
                          </div>
                          
                          {win.promo_code && (
                            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-3">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Code promo :</p>
                              <p className="text-xl font-mono font-bold text-blue-600 dark:text-blue-400">
                                {win.promo_code}
                              </p>
                            </div>
                          )}

                          {win.prize_type === 'free_drink' && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-3 border border-blue-200 dark:border-blue-800">
                              <p className="text-sm text-blue-800 dark:text-blue-200">
                                🥤 <strong>Boisson offerte</strong> - Une boisson vous sera automatiquement ajoutée à votre prochaine commande
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                            <span>
                              Valable jusqu'au {new Date(win.valid_until).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric'
                              })}
                            </span>
                            {win.prize_value && (
                              <span className="text-green-600 dark:text-green-400 font-semibold">
                                {win.prize_type === 'discount' || win.prize_type === 'surprise' 
                                  ? `-${win.prize_value}%`
                                  : `-${win.prize_value}€`}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-4">
                          {isValid && !isUsed ? (
                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-xs font-semibold">
                              Actif
                            </span>
                          ) : isUsed ? (
                            <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-xs font-semibold">
                              Utilisé
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full text-xs font-semibold">
                              Expiré
                            </span>
                          )}
                        </div>
                      </div>

                      {isValid && !isUsed && (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                            💡 <strong>Comment utiliser :</strong>
                          </p>
                          {win.promo_code ? (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Entrez le code <strong className="font-mono">{win.promo_code}</strong> lors de votre prochaine commande au checkout.
                            </p>
                          ) : (
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                              Votre boisson sera automatiquement ajoutée lors de votre prochaine commande. Aucun code nécessaire !
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Onglet Paramètres */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">Paramètres du compte</h3>
                
                <div className="space-y-4">
                  <NotificationToggle
                    enabled={emailNotifications}
                    onChange={handleEmailNotificationChange}
                    label="Notifications par email"
                    description="Recevoir des mises à jour sur vos commandes"
                  />

                  <NotificationToggle
                    enabled={pushNotifications}
                    onChange={handlePushNotificationChange}
                    label="Notifications push"
                    description="Recevoir des notifications sur votre appareil"
                  />

                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Mode sombre</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Interface sombre pour économiser la batterie</p>
                    </div>
                    <DarkModeToggle />
                  </div>
                </div>
              </div>

              {/* Signaler un bug */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Aide et support</h3>
                <button
                  onClick={() => router.push('/report-bug')}
                  className="w-full flex items-center justify-center space-x-2 bg-red-600 dark:bg-red-700 text-white px-4 py-3 rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors"
                >
                  <FaBug className="h-5 w-5" />
                  <span>Signaler un bug</span>
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                  Aidez-nous à améliorer CVN'Eat en signalant les problèmes rencontrés
                </p>
              </div>

              {/* Points de fidélité - Désactivé temporairement jusqu'à implémentation complète */}
              {/* <LoyaltyProgram userPoints={user?.points_fidelite || 0} /> */}

              <PushNotificationService />

              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-red-900 mb-4">Zone de danger</h3>
                <button
                  onClick={async () => {
                    if (confirm('Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible et toutes vos données seront supprimées.')) {
                      try {
                        setLoading(true);
                        const { data: { session } } = await supabase.auth.getSession();
                        if (!session) {
                          setError('Session expirée, veuillez vous reconnecter');
                          setLoading(false);
                          return;
                        }

                        const response = await fetch('/api/users/delete-account', {
                          method: 'DELETE',
                          headers: {
                            'Authorization': `Bearer ${session.access_token}`,
                            'Content-Type': 'application/json',
                          }
                        });

                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Erreur lors de la suppression du compte');
                        }

                        // Déconnexion et redirection
                        await supabase.auth.signOut();
                        router.push('/');
                      } catch (err) {
                        setError(err.message || 'Erreur lors de la suppression du compte');
                        setLoading(false);
                      }
                    }
                  }}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Supprimer mon compte
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 