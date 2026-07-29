'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DeliveryNavbar from '../../components/DeliveryNavbar';
import { supabase } from '../../../lib/supabase';
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaMotorcycle,
  FaSave,
  FaEdit,
  FaCamera,
  FaMapMarkerAlt,
  FaStar,
  FaCheckCircle,
  FaFileInvoice,
  FaDownload,
  FaUpload
} from 'react-icons/fa';
import Link from 'next/link';

export default function DeliveryProfile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [formData, setFormData] = useState({
    prenom: '',
    nom: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    photo_url: '',
    legal_name: '',
    siret: '',
    vat_number: '',
  });
  const [transfers, setTransfers] = useState([]);
  const [savingBilling, setSavingBilling] = useState(false);
  const [uploadingKbis, setUploadingKbis] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      await fetchProfile(session.user.id);
      await fetchStats();
      await fetchTransfers(session.access_token);
    } catch (error) {
      console.error('Erreur auth:', error);
      router.push('/login');
    }
  };

  const fetchProfile = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/delivery/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setFormData({
          prenom: data.prenom || '',
          nom: data.nom || '',
          telephone: data.telephone || '',
          adresse: data.adresse || '',
          code_postal: data.code_postal || '',
          ville: data.ville || '',
          photo_url: data.photo_url || '',
          legal_name: data.legal_name || '',
          siret: data.siret || '',
          vat_number: data.vat_number || '',
        });
        // kbis_url reste sur profile
      }
    } catch (error) {
      console.error('Erreur récupération profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;
      
      const response = await fetch(`/api/delivery/stats?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error);
    }
  };

  const fetchTransfers = async (accessToken) => {
    try {
      const response = await fetch('/api/delivery/transfers', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTransfers(data.transfers || []);
      }
    } catch (error) {
      console.error('Erreur factures:', error);
    }
  };

  const openInvoice = async (transferId, reference) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/delivery/transfers/${transferId}/invoice`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Impossible d’ouvrir la facture');
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${reference || transferId}.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'Erreur facture');
    }
  };

  const saveBilling = async () => {
    setSavingBilling(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch('/api/delivery/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          legal_name: formData.legal_name,
          siret: formData.siret,
          vat_number: formData.vat_number,
          adresse: formData.adresse,
          code_postal: formData.code_postal,
          ville: formData.ville,
        }),
      });
      if (!response.ok) throw new Error('Erreur enregistrement');
      const updated = await response.json();
      setProfile((p) => ({ ...p, ...updated }));
      setMessage({ type: 'success', text: 'Infos facturation enregistrées' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: e.message || 'Erreur' });
    } finally {
      setSavingBilling(false);
    }
  };

  const uploadKbis = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploadingKbis(true);
    setMessage({ type: '', text: '' });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/delivery/profile/kbis', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Échec upload KBIS');
      setProfile((p) => ({ ...p, kbis_url: json.kbis_url }));
      setMessage({ type: 'success', text: 'KBIS enregistré' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erreur KBIS' });
    } finally {
      setUploadingKbis(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/delivery/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        setMessage({ type: 'success', text: 'Profil mis à jour avec succès !' });
        
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        throw new Error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour du profil' });
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DeliveryNavbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement du profil...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DeliveryNavbar />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Message de succès/erreur */}
        {message.text && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        {/* En-tête du profil */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                <FaEdit />
                <span>Modifier</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-6 mb-6">
            {/* Photo de profil */}
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-3xl font-bold">
                {profile?.prenom?.[0]}{profile?.nom?.[0]}
              </div>
              {editing && (
                <button className="absolute bottom-0 right-0 bg-orange-500 text-white p-2 rounded-full hover:bg-orange-600">
                  <FaCamera />
                </button>
              )}
            </div>

            {/* Infos principales */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {profile?.prenom} {profile?.nom}
              </h2>
              <p className="text-gray-600">{user?.email}</p>
              <div className="flex items-center space-x-2 mt-2">
                <FaMotorcycle className="text-orange-500" />
                <span className="text-sm font-medium text-gray-700">Livreur CVN'EAT</span>
              </div>
            </div>
          </div>

          {/* Statistiques */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-orange-600 mb-2">
                  <FaCheckCircle />
                  <span className="text-sm font-medium">Livraisons (total)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_deliveries_all ?? stats.total_deliveries ?? 0}</p>
                <p className="text-xs text-orange-700 mt-1">À encaisser: {stats.total_deliveries ?? 0}</p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-green-600 mb-2">
                  <FaStar />
                  <span className="text-sm font-medium">Note moyenne</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.average_rating ? stats.average_rating.toFixed(1) : '0.0'} / 5
                </p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center space-x-2 text-blue-600 mb-2">
                  <FaMotorcycle />
                  <span className="text-sm font-medium">Gains (total)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_earnings_all
                    ? stats.total_earnings_all.toFixed(2)
                    : stats.total_earnings
                      ? stats.total_earnings.toFixed(2)
                      : '0.00'}€
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  À encaisser: {stats.total_earnings ? stats.total_earnings.toFixed(2) : '0.00'}€
                </p>
              </div>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Prénom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    name="prenom"
                    value={formData.prenom}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>
              </div>

              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <div className="relative">
                  <FaUser className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    name="nom"
                    value={formData.nom}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>
              </div>

              {/* Email (lecture seule) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <div className="relative">
                  <FaEnvelope className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-gray-100"
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <div className="relative">
                  <FaPhone className="absolute left-3 top-3 text-gray-400" />
                  <input
                    type="tel"
                    name="telephone"
                    value={formData.telephone}
                    onChange={handleChange}
                    disabled={!editing}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Adresse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <div className="relative">
                <FaMapMarkerAlt className="absolute left-3 top-3 text-gray-400" />
                <textarea
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={2}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal</label>
                <input
                  type="text"
                  name="code_postal"
                  value={formData.code_postal}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville</label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  disabled={!editing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Facturation déplacée hors formulaire (carte dédiée plus bas) */}

            {/* Boutons */}
            {editing && (
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      prenom: profile?.prenom || '',
                      nom: profile?.nom || '',
                      telephone: profile?.telephone || '',
                      adresse: profile?.adresse || '',
                      code_postal: profile?.code_postal || '',
                      ville: profile?.ville || '',
                      photo_url: profile?.photo_url || '',
                      legal_name: profile?.legal_name || '',
                      siret: profile?.siret || '',
                      vat_number: profile?.vat_number || '',
                    });
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center space-x-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  <FaSave />
                  <span>{saving ? 'Enregistrement...' : 'Enregistrer'}</span>
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Infos facturation — toujours accessible */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border-2 border-orange-100">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">SIRET / KBIS (factures)</h2>
              <p className="text-sm text-gray-500 mt-1">
                Obligatoire pour tes factures de paiement. Remplis une fois, c&apos;est bon.
              </p>
            </div>
            {(!profile?.siret || !profile?.legal_name) && (
              <span className="text-xs font-medium bg-amber-100 text-amber-800 px-2 py-1 rounded">
                À compléter
              </span>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Raison sociale / nom commercial
              </label>
              <input
                type="text"
                name="legal_name"
                value={formData.legal_name}
                onChange={handleChange}
                placeholder="Ex: MEDJBOUR Baghdad"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <input
                  type="text"
                  name="siret"
                  value={formData.siret}
                  onChange={handleChange}
                  placeholder="14 chiffres"
                  inputMode="numeric"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° TVA (optionnel)
                </label>
                <input
                  type="text"
                  name="vat_number"
                  value={formData.vat_number}
                  onChange={handleChange}
                  placeholder="FR..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                KBIS / extrait (PDF ou photo)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm cursor-pointer hover:bg-black">
                  <FaUpload />
                  {uploadingKbis ? 'Envoi…' : 'Téléverser le KBIS'}
                  <input
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    disabled={uploadingKbis}
                    onChange={uploadKbis}
                  />
                </label>
                {profile?.kbis_url && (
                  <a
                    href={profile.kbis_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-orange-600 underline"
                  >
                    Voir le document déposé
                  </a>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={saveBilling}
              disabled={savingBilling}
              className="inline-flex items-center gap-2 bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              <FaSave />
              {savingBilling ? 'Enregistrement…' : 'Enregistrer facturation'}
            </button>
          </div>
        </div>

        {/* Factures */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <FaFileInvoice className="text-orange-500" />
              Mes factures de paiement
            </h2>
            <Link
              href="/delivery/factures"
              className="text-sm font-medium text-orange-600 hover:underline"
            >
              Tout voir
            </Link>
          </div>
          {transfers.length === 0 ? (
            <p className="text-sm text-gray-500">
              Aucun paiement reçu pour le moment. Tu seras notifié (push + email) à chaque virement.
            </p>
          ) : (
            <ul className="divide-y">
              {transfers.slice(0, 5).map((t) => (
                <li key={t.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900">
                      {parseFloat(t.amount || 0).toFixed(2)} €
                    </p>
                    <p className="text-xs text-gray-500">
                      {t.transfer_date
                        ? new Date(t.transfer_date).toLocaleDateString('fr-FR')
                        : '—'}
                      {t.orders_count ? ` · ${t.orders_count} course(s)` : ''}
                      {t.reference_number ? ` · ${t.reference_number}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openInvoice(t.id, t.reference_number)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-900 text-white rounded-lg hover:bg-black"
                  >
                    <FaDownload />
                    Télécharger
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Section Sécurité */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Sécurité</h2>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/change-password')}
              className="w-full text-left px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Changer le mot de passe
            </button>
            <button
              onClick={async () => {
                if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                  await supabase.auth.signOut();
                  router.push('/');
                }
              }}
              className="w-full text-left px-4 py-3 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

