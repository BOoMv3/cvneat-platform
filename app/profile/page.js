'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { FaShoppingBag, FaMapMarkerAlt, FaStar, FaClock, FaMotorcycle, FaSignOutAlt } from 'react-icons/fa';

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

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (authChecked && user) {
      fetchData();
    }
  }, [activeTab, authChecked, user]);

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
      setUser(userData);
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
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  // Affichage d'erreur d'authentification
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white p-8 rounded shadow text-center">
              <p className="text-red-600 font-bold">Utilisateur non trouvé ou non connecté.</p>
              <button onClick={() => router.push('/login')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded">Se connecter</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Mon profil</h1>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
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
              className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded shadow mb-6"
            >
              <div>
                <label className="block text-sm font-medium">Nom</label>
                <input
                  type="text"
                  value={user.name || ''}
                  onChange={e => setUser(u => ({ ...u, name: e.target.value }))}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={user.email || ''}
                  onChange={e => setUser(u => ({ ...u, email: e.target.value }))}
                  className="input-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Téléphone</label>
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

          {/* Onglets */}
          <div className="flex flex-wrap gap-2 sm:gap-4 mb-6 sm:mb-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 sm:px-4 py-2 rounded-lg min-h-[44px] touch-manipulation text-sm sm:text-base ${
                activeTab === 'orders'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FaShoppingBag className="inline-block mr-2" />
              Mes commandes
            </button>
            <button
              onClick={() => setActiveTab('addresses')}
              className={`px-3 sm:px-4 py-2 rounded-lg min-h-[44px] touch-manipulation text-sm sm:text-base ${
                activeTab === 'addresses'
                  ? 'bg-black text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <FaMapMarkerAlt className="inline-block mr-2" />
              Mes adresses
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              {error}
            </div>
          )}

          {/* Contenu des onglets */}
          {activeTab === 'orders' ? (
            <div className="space-y-4 sm:space-y-6">
              {orders.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 text-sm sm:text-base">Vous n'avez pas encore de commandes</p>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => router.push(`/profile/orders/${order.id}`)}
                    className="bg-white rounded-lg shadow-sm p-4 sm:p-6 cursor-pointer hover:shadow-md transition-shadow min-h-[44px] touch-manipulation"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-3 sm:mb-4 space-y-2 sm:space-y-0">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold truncate">{order.restaurantName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
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
                        <p className="text-xs sm:text-sm text-gray-500">
                          +{order.items.length - 2} autres articles
                        </p>
                      )}
                    </div>

                    <div className="border-t pt-3 sm:pt-4">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-2 sm:space-y-0">
                        <div className="text-xs sm:text-sm text-gray-500">
                          <p>Adresse de livraison</p>
                          <p className="truncate">{order.deliveryAddress}</p>
                          <p>{order.deliveryCity}, {order.deliveryPostalCode}</p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="font-medium text-sm sm:text-base">Total</p>
                          <p className="text-base sm:text-lg font-bold">{order.total.toFixed(2)}€</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              <form onSubmit={handleAddressSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 bg-white p-4 sm:p-6 rounded shadow mb-4 sm:mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Nom</label>
                  <input type="text" value={addressForm.name} onChange={e => setAddressForm(f => ({ ...f, name: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Adresse</label>
                  <input type="text" value={addressForm.address} onChange={e => setAddressForm(f => ({ ...f, address: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Ville</label>
                  <input type="text" value={addressForm.city} onChange={e => setAddressForm(f => ({ ...f, city: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Code postal</label>
                  <input type="text" value={addressForm.postalCode} onChange={e => setAddressForm(f => ({ ...f, postalCode: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" required />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Instructions (optionnel)</label>
                  <input type="text" value={addressForm.instructions} onChange={e => setAddressForm(f => ({ ...f, instructions: e.target.value }))} className="input-primary min-h-[44px] touch-manipulation" />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row justify-end gap-2">
                  <button type="submit" className="bg-blue-600 text-white px-4 sm:px-6 py-2 rounded hover:bg-blue-700 min-h-[44px] touch-manipulation text-sm sm:text-base" disabled={loading}>
                    {editAddressId ? 'Modifier' : 'Ajouter'}
                  </button>
                  {editAddressId && (
                    <button type="button" onClick={() => { setAddressForm({ name: '', address: '', city: '', postalCode: '', instructions: '' }); setEditAddressId(null); }} className="bg-gray-300 text-gray-800 px-4 sm:px-6 py-2 rounded min-h-[44px] touch-manipulation text-sm sm:text-base">Annuler</button>
                  )}
                </div>
                {error && <div className="col-span-2 p-2 bg-red-100 text-red-700 rounded mt-2">{error}</div>}
                {success && <div className="col-span-2 p-2 bg-green-100 text-green-700 rounded mt-2">{success}</div>}
              </form>
              {addresses.length === 0 ? (
                <div className="text-center py-6 sm:py-8">
                  <p className="text-gray-500 text-sm sm:text-base">Vous n'avez pas encore d'adresses</p>
                </div>
              ) : (
                addresses.map((address) => (
                  <div
                    key={address.id}
                    className="bg-white rounded-lg shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-bold mb-1 sm:mb-2 truncate">{address.name}</h3>
                      <p className="text-sm sm:text-base truncate">{address.address}</p>
                      <p className="text-sm sm:text-base">{address.city}, {address.postalCode}</p>
                      {address.instructions && (
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">Instructions : {address.instructions}</p>
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
        </div>
      </main>
    </div>
  );
} 