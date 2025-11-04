'use client';
import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AuthGuard from '@/components/AuthGuard';
import { FaPlus, FaEdit, FaTrash, FaEye, FaEyeSlash, FaCalendarAlt, FaImage, FaLink } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jxbqrvlmvnofaxbtcmsw.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4YnFydmxtdm5vZmF4YnRjbXN3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ0NzQ4NzcsImV4cCI6MjA1MDA1MDg3N30.G7iFlb2vKi1ouABfyI_azLbZ8XGi66tf9kx_dtVIE40'
);

export default function AdsManagement() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAd, setEditingAd] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    position: 'banner_top',
    is_active: true,
    start_date: '',
    end_date: '',
    price: 0,
    advertiser_name: '',
    advertiser_email: '',
    advertiser_phone: ''
  });

  const positions = [
    { value: 'banner_middle', label: 'Milieu de page' },
    { value: 'footer', label: 'Bas de page' }
  ];

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('advertisements')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des publicités:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAd) {
        const { error } = await supabase
          .from('advertisements')
          .update(formData)
          .eq('id', editingAd.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('advertisements')
          .insert([formData]);
        
        if (error) throw error;
      }
      
      setShowForm(false);
      setEditingAd(null);
      setFormData({
        title: '',
        description: '',
        image_url: '',
        link_url: '',
        position: 'banner_top',
        is_active: true,
        start_date: '',
        end_date: '',
        price: 0,
        advertiser_name: '',
        advertiser_email: '',
        advertiser_phone: ''
      });
      fetchAds();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      alert(`Erreur lors de la sauvegarde: ${error.message}`);
    }
  };

  const handleEdit = (ad) => {
    setEditingAd(ad);
    setFormData(ad);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette publicité ?')) {
      try {
        const { error } = await supabase
          .from('advertisements')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        fetchAds();
      } catch (error) {
        console.error('Erreur lors de la suppression:', error);
      }
    }
  };

  const toggleActive = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('advertisements')
        .update({ is_active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-4 sm:py-8">
          <div className="bg-white rounded-lg shadow-sm border p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestion des publicités</h1>
                <p className="text-sm sm:text-base text-gray-600 mt-1">
                  Gérez les espaces publicitaires et les annonceurs
                </p>
              </div>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 sm:mt-0 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] touch-manipulation w-full sm:w-auto"
              >
                <FaPlus className="h-4 w-4" />
                <span className="text-sm sm:text-base">Nouvelle publicité</span>
              </button>
            </div>

            {/* Formulaire */}
            {showForm && (
              <div className="bg-gray-50 rounded-lg p-4 sm:p-6 mb-6">
                <h2 className="text-lg sm:text-xl font-semibold mb-4">
                  {editingAd ? 'Modifier la publicité' : 'Nouvelle publicité'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Titre *
                      </label>
                      <input
                        type="text"
                        value={formData.title}
                        onChange={(e) => setFormData({...formData, title: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Position *
                      </label>
                      <select
                        value={formData.position}
                        onChange={(e) => setFormData({...formData, position: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                        required
                      >
                        {positions.map(pos => (
                          <option key={pos.value} value={pos.value}>{pos.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL de l'image *
                      </label>
                      <input
                        type="url"
                        value={formData.image_url}
                        onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        URL de destination
                      </label>
                      <input
                        type="url"
                        value={formData.link_url}
                        onChange={(e) => setFormData({...formData, link_url: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Prix (€) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de début
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date de fin
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nom de l'annonceur *
                      </label>
                      <input
                        type="text"
                        value={formData.advertiser_name}
                        onChange={(e) => setFormData({...formData, advertiser_name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email annonceur
                      </label>
                      <input
                        type="email"
                        value={formData.advertiser_email}
                        onChange={(e) => setFormData({...formData, advertiser_email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Téléphone annonceur
                      </label>
                      <input
                        type="tel"
                        value={formData.advertiser_phone}
                        onChange={(e) => setFormData({...formData, advertiser_phone: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] touch-manipulation"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                      Publicité active
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 min-h-[44px] touch-manipulation"
                    >
                      {editingAd ? 'Modifier' : 'Créer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingAd(null);
                        setFormData({
                          title: '',
                          description: '',
                          image_url: '',
                          link_url: '',
                          position: 'banner_top',
                          is_active: true,
                          start_date: '',
                          end_date: '',
                          price: 0,
                          advertiser_name: '',
                          advertiser_email: '',
                          advertiser_phone: ''
                        });
                      }}
                      className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 min-h-[44px] touch-manipulation"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Liste des publicités */}
            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Chargement...</p>
                </div>
              ) : ads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">Aucune publicité trouvée</p>
                </div>
              ) : (
                ads.map((ad) => (
                  <div key={ad.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1">
                        <div className="flex items-start space-x-3">
                          {ad.image_url && (
                            <img
                              src={ad.image_url}
                              alt={ad.title}
                              className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">
                              {ad.title}
                            </h3>
                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                              {ad.description}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {positions.find(p => p.value === ad.position)?.label}
                              </span>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {ad.price}€
                              </span>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                ad.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {ad.is_active ? 'Actif' : 'Inactif'}
                              </span>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              <p>Annonceur: {ad.advertiser_name}</p>
                              {ad.start_date && ad.end_date && (
                                <p>Du {new Date(ad.start_date).toLocaleDateString()} au {new Date(ad.end_date).toLocaleDateString()}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 mt-3 sm:mt-0">
                        <button
                          onClick={() => toggleActive(ad.id, ad.is_active)}
                          className={`p-2 rounded-lg ${
                            ad.is_active ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-green-100 text-green-600 hover:bg-green-200'
                          }`}
                          title={ad.is_active ? 'Désactiver' : 'Activer'}
                        >
                          {ad.is_active ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleEdit(ad)}
                          className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"
                          title="Modifier"
                        >
                          <FaEdit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ad.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                          title="Supprimer"
                        >
                          <FaTrash className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
