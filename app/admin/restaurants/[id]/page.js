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
  const [commissionRate, setCommissionRate] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [adjustingMarkup, setAdjustingMarkup] = useState(false);
  const [legalName, setLegalName] = useState('');
  const [siret, setSiret] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [savingLegal, setSavingLegal] = useState(false);
  const [savingManualStatus, setSavingManualStatus] = useState(false);

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
      setCommissionRate(data?.commission_rate != null && data?.commission_rate !== '' ? String(data.commission_rate) : '');
      setLegalName(data?.legal_name || '');
      setSiret(data?.siret || '');
      setVatNumber(data?.vat_number || '');
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

  const saveCommissionRate = async () => {
    if (!restaurant) return;
    setSavingCommission(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const val = commissionRate === '' ? null : parseFloat(commissionRate);
      if (val !== null && (Number.isNaN(val) || val < 0 || val > 100)) {
        alert('Valeur invalide (0 à 100)');
        return;
      }
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ commission_rate: val }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur sauvegarde');
      setRestaurant((prev) => ({ ...prev, commission_rate: val }));
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setSavingCommission(false);
    }
  };

  const adjustPricesMarkup = async (oldPct, newPct) => {
    if (!restaurant) return;
    if (!confirm(`Passer tous les prix de +${oldPct}% à +${newPct}% pour ce restaurant ? Cette action modifie le menu.`)) return;
    setAdjustingMarkup(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}/adjust-prices-markup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ oldMarkupPercent: oldPct, newMarkupPercent: newPct }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Erreur');
      alert(json.message || `${json.updated} article(s) mis à jour.`);
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setAdjustingMarkup(false);
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

  const saveLegalInfo = async () => {
    if (!restaurant) return;
    setSavingLegal(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const payload = {
        legal_name: legalName.trim() || null,
        siret: siret.trim().replace(/\s/g, '') || null,
        vat_number: vatNumber.trim() || null,
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
      if (!res.ok) throw new Error(json.error || 'Erreur sauvegarde');
      setRestaurant((prev) => ({ ...prev, ...payload }));
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setSavingLegal(false);
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
      setLegalName(r.legal_name || '');
      setSiret(r.siret || '');
      setVatNumber(r.vat_number || '');
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

  const truthyFlag = (v) =>
    v === true || v === 1 || v === '1' || (typeof v === 'string' && ['true', 'yes', 'oui', 'on'].includes(v.trim().toLowerCase()));

  const setAdminManualVisibility = async (mode) => {
    if (!restaurant?.id) return;
    setSavingManualStatus(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        router.push('/login');
        return;
      }
      const body =
        mode === 'force_closed'
          ? { ferme_manuellement: true, ouvert_manuellement: false }
          : mode === 'force_open'
            ? { ferme_manuellement: false, ouvert_manuellement: true }
            : { ferme_manuellement: false, ouvert_manuellement: false };
      const res = await fetch(`/api/admin/restaurants/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || json.details || 'Mise à jour refusée');
      if (json.restaurant && typeof json.restaurant === 'object') {
        setRestaurant((prev) => ({ ...prev, ...json.restaurant }));
      }
      await fetchRestaurantDetails();
      try {
        window.dispatchEvent(new CustomEvent('restaurant-status-changed'));
      } catch {
        // ignore
      }
    } catch (e) {
      alert(e.message || 'Erreur');
    } finally {
      setSavingManualStatus(false);
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
    const s = (status || '').toLowerCase();
    if (['pending', 'en_attente'].includes(s)) return 'bg-yellow-100 text-yellow-800';
    if (['accepted', 'acceptee'].includes(s)) return 'bg-green-100 text-green-800';
    if (['rejected', 'refusee', 'annulee'].includes(s)) return 'bg-red-100 text-red-800';
    if (['preparing', 'en_preparation'].includes(s)) return 'bg-blue-100 text-blue-800';
    if (['ready', 'prete'].includes(s)) return 'bg-purple-100 text-purple-800';
    if (['en_livraison', 'in_delivery'].includes(s)) return 'bg-indigo-100 text-indigo-800';
    if (['delivered', 'livree'].includes(s)) return 'bg-gray-100 text-gray-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getOrderStatusText = (status) => {
    const s = (status || '').toLowerCase();
    if (['pending', 'en_attente'].includes(s)) return 'En attente';
    if (['accepted', 'acceptee'].includes(s)) return 'Acceptée';
    if (['rejected', 'refusee', 'annulee'].includes(s)) return s === 'annulee' ? 'Annulée' : 'Refusée';
    if (['preparing', 'en_preparation'].includes(s)) return 'En préparation';
    if (['ready', 'prete'].includes(s)) return 'Prête';
    if (['en_livraison', 'in_delivery'].includes(s)) return 'En livraison';
    if (['delivered', 'livree'].includes(s)) return 'Livrée';
    return status || '—';
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

  const st = (o) => o.statut || o.status || '';
  const totalRevenue = orders
    .filter(o => ['acceptee', 'en_preparation', 'prete', 'en_livraison', 'livree', 'accepted', 'preparing', 'ready', 'in_delivery', 'delivered'].includes(st(o)))
    .reduce((sum, order) => sum + parseFloat(order.total || order.total_amount || 0), 0);
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => st(o) === 'en_attente' || st(o) === 'pending').length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <button
              onClick={() => router.push('/admin/restaurants')}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <FaArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">{restaurant.nom}</h1>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
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
                    <span className="hidden sm:inline">{restaurant.status === 'active' ? 'Désactiver' : 'Activer'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-indigo-200 bg-indigo-50/90 p-4 shadow-sm">
          <h2 className="text-sm font-semibold text-indigo-950 mb-1">Visibilité « ouvert / fermé » pour les clients</h2>
          <p className="text-xs text-indigo-900/85 mb-3">
            Indépendant du statut <strong>Actif / Inactif</strong> ci-dessus. <strong>Automatique</strong> = horaires + éventuelle fermeture partenaire.
            <strong> Fermé manuel</strong> = plus de commandes sur la plateforme. <strong>Ouvert forcé</strong> = affiché ouvert malgré les horaires.
          </p>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const fm = truthyFlag(restaurant?.ferme_manuellement);
              const om = truthyFlag(restaurant?.ouvert_manuellement);
              const auto = !fm && !om;
              const btn = (active) =>
                `px-3 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 ${
                  active
                    ? 'bg-indigo-700 text-white ring-2 ring-indigo-400 ring-offset-1'
                    : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-100'
                }`;
              return (
                <>
                  <button
                    type="button"
                    disabled={savingManualStatus}
                    onClick={() => void setAdminManualVisibility('auto')}
                    className={btn(auto)}
                  >
                    Automatique
                  </button>
                  <button
                    type="button"
                    disabled={savingManualStatus}
                    onClick={() => void setAdminManualVisibility('force_closed')}
                    className={btn(fm && !om)}
                  >
                    Fermé manuellement
                  </button>
                  <button
                    type="button"
                    disabled={savingManualStatus}
                    onClick={() => void setAdminManualVisibility('force_open')}
                    className={btn(om && !fm)}
                  >
                    Ouvert forcé
                  </button>
                </>
              );
            })()}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Informations du restaurant</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Informations generales</h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Nom :</span> {restaurant.nom}</p>
                    <p><span className="font-medium">Email :</span> {restaurant.email}</p>
                    <p><span className="font-medium">Telephone :</span> {restaurant.telephone}</p>
                    <p><span className="font-medium">Type de cuisine :</span> {restaurant.type_cuisine}</p>
                    <p><span className="font-medium">Capacite :</span> {restaurant.capacite} couverts</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Commission CVN'EAT :</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        placeholder="20"
                        className="w-16 px-2 py-1 border rounded text-sm"
                      />
                      <span>%</span>
                      <button
                        onClick={saveCommissionRate}
                        disabled={savingCommission}
                        className="px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 disabled:opacity-60"
                      >
                        {savingCommission ? '...' : 'Appliquer'}
                      </button>
                      <span className="text-xs text-gray-500">(défaut 20%, partenaire Boost = 15%)</span>
                    </div>
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
                    <div className="mt-3 pt-2 border-t border-amber-200">
                      <p className="font-medium text-amber-800 mb-1">Ajuster les prix (ex. Deliss King)</p>
                      <p className="text-xs text-gray-500 mb-2">Si les prix sont actuellement à +25% et doivent passer à +7% (nouvelle stratégie 15% commission) :</p>
                      <button
                        type="button"
                        onClick={() => adjustPricesMarkup(25, 7)}
                        disabled={adjustingMarkup}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded text-sm hover:bg-amber-700 disabled:opacity-60"
                      >
                        {adjustingMarkup ? 'Application...' : 'Passer les prix de +25% à +7%'}
                      </button>
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
                  <div className="space-y-3 text-sm">
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">Raison sociale</label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="Nom de l'entreprise (facturation)"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">SIRET</label>
                      <input
                        type="text"
                        value={siret}
                        onChange={(e) => setSiret(e.target.value.replace(/\D/g, '').slice(0, 14))}
                        placeholder="14 chiffres"
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-gray-700 mb-1">TVA intracommunautaire</label>
                      <input
                        type="text"
                        value={vatNumber}
                        onChange={(e) => setVatNumber(e.target.value)}
                        placeholder="FR..."
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      />
                    </div>
                    <button
                      onClick={saveLegalInfo}
                      disabled={savingLegal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-60"
                    >
                      {savingLegal ? 'Enregistrement…' : 'Enregistrer'}
                    </button>
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

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Statistiques</h2>
              
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

            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 overflow-x-auto">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Commandes récentes</h2>
              
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
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getOrderStatusColor(order.statut || order.status)}`}>
                          {getOrderStatusText(order.statut || order.status)}
                        </span>
                        <p className="text-sm font-medium mt-1">{(order.total || order.total_amount || 0)}€</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold mb-4">Actions rapides</h2>
              
              <div className="space-y-3">
                <button
                  onClick={() => router.push(`/restaurants/${restaurant.id}`)}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-sm sm:text-base"
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
