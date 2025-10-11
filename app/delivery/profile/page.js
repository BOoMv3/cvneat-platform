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
  FaCheckCircle
} from 'react-icons/fa';

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
    photo_url: ''
  });

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
      await fetchStats(session.user.id);
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
          photo_url: data.photo_url || ''
        });
      }
    } catch (error) {
      console.error('Erreur récupération profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (userId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/delivery/stats', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erreur récupération stats:', error);
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
                  <span className="text-sm font-medium">Livraisons</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total_deliveries || 0}</p>
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
                  <span className="text-sm font-medium">Gains totaux</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.total_earnings ? stats.total_earnings.toFixed(2) : '0.00'}€
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
                  rows={3}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:bg-gray-100"
                />
              </div>
            </div>

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
                      photo_url: profile?.photo_url || ''
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

