'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../../lib/supabase';
import { FaArrowLeft, FaEdit, FaToggleOn, FaToggleOff, FaSpinner, FaEye } from 'react-icons/fa';

export default function RestaurantDetail({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [sireneLoading, setSireneLoading] = useState(false);
  const [sireneError, setSireneError] = useState(null);
  const [sireneQuery, setSireneQuery] = useState({ name: '', postalCode: '', city: '' });
  const [sireneResults, setSireneResults] = useState([]);
  const [reductionPct, setReductionPct] = useState('');
  const [savingReduction, setSavingReduction] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchRestaurantDetails();
      fetchRestaurantOrders();
    }
  }, [params.id]);

  const fetchRestaurantDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', params.id)
        .single();

      if (error) throw error;
      setRestaurant(data);
      setReductionPct(data?.strategie_boost_reduction_pct != null ? String(data.strategie_boost_reduction_pct) : '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const runSireneSearch = async () => {
    try {
      setSireneError(null);
      setSireneResults([]);
      setSireneLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const params = new URLSearchParams();
      const name = (sireneQuery.name || restaurant?.nom || '').trim();
      if (name) params.set('name', name);
      if ((sireneQuery.postalCode || '').trim()) params.set('postalCode', sireneQuery.postalCode.trim());
      if ((sireneQuery.city || '').trim()) params.set('city', sireneQuery.city.trim());
      params.set('limit', '10');

      const res = await fetch(`/api/admin/sirene/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur INSEE SIRENE');
      setSireneResults(json.results || []);
    } catch (e) {
      setSireneError(e.message || 'Erreur INSEE SIRENE');
    } finally {
      setSireneLoading(false);
    }
  };

  const saveReductionPct = async () => {
    if (!restaurant) return;
    setSavingReduction(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const val = reductionPct === '' ? null : parseInt(reductionPct, 10);
      if (val !== null && (isNaN(val) || val > 0 || val < -50)) {
        alert('Valeur invalide (-50 à 0)');
        return;
      }
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ strategie_boost_reduction_pct: val }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur sauvegarde');
      setRestaurant((prev) => ({ ...prev, strategie_boost_reduction_pct: val }));
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setSavingReduction(false);
    }
  };

  const applySireneResult = async (r) => {
    try {
      setUpdating(true);
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }

      const payload = {
        legal_name: r.legal_name || null,
        siret: r.siret || null,
        vat_number: r.vat_number || null,
      };

      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur sauvegarde restaurant');

      setRestaurant((prev) => ({ ...prev, ...payload }));
      setSireneResults([]);
      setSireneError(null);
    } catch (e) {
      setError(e.message || 'Erreur sauvegarde');
    } finally {
      setUpdating(false);
    }
  };

  const fetchRestaurantOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('commandes')
        .select('*')
        .eq('restaurant_id', params.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      // Erreur silencieuse
    }
  };

  const toggleRestaurantStatus = async () => {
    if (!restaurant) return;
    
    setUpdating(true);
    try {
      const newStatus = restaurant.status === 'active' ? 'inactive' : 'active';
      const { error } = await supabase
        .from('restaurants')
        .update({ status: newStatus })
        .eq('id', restaurant.id);

      if (error) throw error;
      
      setRestaurant({ ...restaurant, status: newStatus });
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvé';
      case 'rejected': return 'Refusé';
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      default: return status;
    }
  };

  const getOrderStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrderStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'accepted': return 'Acceptee';
      case 'rejected': return 'Refusee';
      case 'preparing': return 'En preparation';
      case 'ready': return 'Prete';
      case 'delivered': return 'Livree';
      default: return status;
    }
  };

  const formatHoraires = (horaires) => {
    if (!horaires) return 'Non renseigne';
    
    try {
      if (typeof horaires === 'string') {
        return horaires;
      }
      
      if (typeof horaires === 'object') {
        const jours = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
        return jours.map(jour => {
          if (horaires[jour]) {
            return `${jour.charAt(0).toUpperCase() + jour.slice(1)}: ${horaires[jour]}`;
          }
          return null;
        }).filter(Boolean).join(', ');
      }
      
      return 'Format non reconnu';
    } catch (err) {
      return 'Erreur de format';
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-gray-500">Restaurant non trouve</p>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenue = orders.filter(o => ['accepted', 'preparing', 'ready', 'delivered'].includes(o.status))
    .reduce((sum, order) => sum + (order.total_amount || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/restaurants')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-3xl font-bold text-gray-900">{restaurant.nom}</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(restaurant.status)}`}>
              {getStatusText(restaurant.status)}
            </span>
            
            {(restaurant.status === 'approved' || restaurant.status === 'active' || restaurant.status === 'inactive') && (
              <button
                onClick={toggleRestaurantStatus}
                disabled={updating}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  restaurant.status === 'active'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {updating ? (
                  <FaSpinner className="animate-spin" />
                ) : (
                  <>
                    {restaurant.status === 'active' ? <FaToggleOn /> : <FaToggleOff />}
                    <span>{restaurant.status === 'active' ? 'Desactiver' : 'Activer'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Informations du restaurant</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Informations generales</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nom :</span> {restaurant.nom}</p>
                    <p><span className="font-medium">Email :</span> {restaurant.email}</p>
                    <p><span className="font-medium">Telephone :</span> {restaurant.telephone}</p>
                    <p><span className="font-medium">Type de cuisine :</span> {restaurant.type_cuisine}</p>
                    <p><span className="font-medium">Capacite :</span> {restaurant.capacite} couverts</p>
                    <p><span className="font-medium">Commission CVN'EAT :</span> {restaurant.commission_rate ?? 20}%</p>
                    <div className="mt-2 pt-2 border-t">
                      <p className="font-medium text-amber-800">Stratégie Boost — Réduction prévue (admin)</p>
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={reductionPct}
                          onChange={(e) => setReductionPct(e.target.value)}
                          placeholder="vide = non config"
                          min="-50"
                          max="0"
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                        <span className="text-sm">%</span>
                        <button
                          onClick={saveReductionPct}
                          disabled={savingReduction}
                          className="px-2 py-1 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-60"
                        >
                          {savingReduction ? '...' : 'Sauver'}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">-20 (+25%), -17 (+20%), -13 (+15%), -9 (+10%), 0 (déjà OK). Vide = partenaire doit appeler.</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Adresse</h3>
                  <div className="space-y-2 text-sm">
                    <p>{restaurant.adresse}</p>
                    <p>{restaurant.code_postal} {restaurant.ville}</p>
                    <p><span className="font-medium">Horaires :</span> {formatHoraires(restaurant.horaires)}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t pt-6">
                <h3 className="font-medium text-gray-900 mb-2">Informations légales (facturation)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Raison sociale :</span> {restaurant.legal_name || '—'}</p>
                    <p><span className="font-medium">SIRET :</span> {restaurant.siret || '—'}</p>
                    <p><span className="font-medium">TVA :</span> {restaurant.vat_number || '—'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm font-medium text-gray-900 mb-2">Rechercher via INSEE SIRENE</p>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        className="px-3 py-2 border rounded-lg text-sm"
                        placeholder="Nom (par défaut: nom du restaurant)"
                        value={sireneQuery.name}
                        onChange={(e) => setSireneQuery((p) => ({ ...p, name: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Code postal"
                          value={sireneQuery.postalCode}
                          onChange={(e) => setSireneQuery((p) => ({ ...p, postalCode: e.target.value }))}
                        />
                        <input
                          className="px-3 py-2 border rounded-lg text-sm"
                          placeholder="Ville"
                          value={sireneQuery.city}
                          onChange={(e) => setSireneQuery((p) => ({ ...p, city: e.target.value }))}
                        />
                      </div>
                      <button
                        onClick={runSireneSearch}
                        disabled={sireneLoading}
                        className="px-3 py-2 bg-black text-white rounded-lg text-sm hover:bg-gray-900 disabled:opacity-60"
                      >
                        {sireneLoading ? 'Recherche…' : 'Rechercher'}
                      </button>
                      {sireneError && (
                        <p className="text-sm text-red-600">{sireneError}</p>
                      )}
                      {sireneResults.length > 0 && (
                        <div className="mt-2 space-y-2 max-h-56 overflow-auto">
                          {sireneResults.map((r) => (
                            <button
                              key={r.siret}
                              onClick={() => applySireneResult(r)}
                              className="w-full text-left border rounded-lg p-3 hover:bg-white bg-gray-100"
                            >
                              <div className="text-sm font-semibold text-gray-900">
                                {r.legal_name || '—'}
                              </div>
                              <div className="text-xs text-gray-600">
                                SIRET {r.siret || '—'} · {r.postal_code || ''} {r.city || ''} {r.address || ''}
                              </div>
                              <div className="text-xs text-gray-500">
                                TVA {r.vat_number || '—'}
                              </div>
                            </button>
                          ))}
                          <p className="text-xs text-gray-500">
                            Clique un résultat pour remplir automatiquement les infos légales.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {restaurant.description && (
                <div className="mt-6">
                  <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{restaurant.description}</p>
                </div>
              )}
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  <span className="font-medium">Date d'inscription :</span> {new Date(restaurant.created_at).toLocaleDateString('fr-FR')}
                </p>
              </div>

            </div>

            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Statistiques</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{totalOrders}</div>
                  <div className="text-sm text-gray-600">Total commandes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{pendingOrders}</div>
                  <div className="text-sm text-gray-600">Commandes en attente</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)}€</div>
                  <div className="text-sm text-gray-600">Chiffre d'affaires</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Commandes recentes</h2>
              
              {orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune commande pour ce restaurant</p>
              ) : (
                <div className="space-y-4">
                  {orders.slice(0, 10).map((order) => (
                    <div key={order.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">Commande #{order.id}</p>
                        <p className="text-sm text-gray-600">{order.customer_name}</p>
                        <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.status)}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                        <p className="text-sm font-medium mt-1">{order.total_amount}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Actions rapides</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/restaurants/${restaurant.id}`)}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <FaEye className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-blue-600">Voir le restaurant</span>
                </button>
                
                <button
                  onClick={() => router.push('/admin/restaurants')}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <FaArrowLeft className="h-4 w-4 text-gray-600" />
                  <span className="font-medium text-gray-600">Retour a la liste</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
