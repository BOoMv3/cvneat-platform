'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaCamera, 
  FaSave, 
  FaTimes,
  FaEdit,
  FaTrash
} from 'react-icons/fa';

export default function PartnerSettings() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(25);
  const [prepTimeUpdatedAt, setPrepTimeUpdatedAt] = useState(null);
  const [showPrepTimeModal, setShowPrepTimeModal] = useState(false);
  const [savingPrepTime, setSavingPrepTime] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: '',
    description: '',
    type_cuisine: '',
    telephone: '',
    adresse: '',
    code_postal: '',
    ville: '',
    email: ''
  });

  const [profileImage, setProfileImage] = useState(null);
  const [bannerImage, setBannerImage] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageType, setImageType] = useState(''); // 'profile' ou 'banner'
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.push('/login');
        return;
      }

      // Vérifier le rôle
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();

      // Autoriser les restaurants ET les admins
      if (userError || !userData || (userData.role !== 'restaurant' && userData.role !== 'admin')) {
        router.push('/');
        return;
      }

      setUser(session.user);

      // Récupérer le restaurant
      const { data: resto, error: restoError } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (restoError || !resto) {
        router.push('/profil-partenaire');
        return;
      }

      setRestaurant(resto);
      setPrepTimeMinutes(Number.isFinite(parseInt(resto.prep_time_minutes, 10)) ? parseInt(resto.prep_time_minutes, 10) : 25);
      setPrepTimeUpdatedAt(resto.prep_time_updated_at || null);
      setFormData({
        nom: resto.nom || '',
        description: resto.description || '',
        type_cuisine: resto.type_cuisine || '',
        telephone: resto.telephone || '',
        adresse: resto.adresse || '',
        code_postal: resto.code_postal || '',
        ville: resto.ville || '',
        email: resto.email || ''
      });

      // Prompt quotidien: si pas de valeur ou pas mise à jour aujourd'hui (timezone France)
      try {
        const tz = 'Europe/Paris';
        const today = new Date().toLocaleDateString('fr-FR', { timeZone: tz });
        const last = resto.prep_time_updated_at
          ? new Date(resto.prep_time_updated_at).toLocaleDateString('fr-FR', { timeZone: tz })
          : null;
        if (!resto.prep_time_minutes || !last || last !== today) {
          setShowPrepTimeModal(true);
        }
      } catch {
        // ignore
      }
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = async (imageUrl, type) => {
    if (!imageUrl) {
      setError('URL d\'image requise');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('imageUrl', imageUrl);
      formData.append('restaurantId', restaurant.id);
      formData.append('imageType', type);
      formData.append('userEmail', user.email);

      const response = await fetch('/api/partner/upload-restaurant-image', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const { imageUrl: updatedUrl } = await response.json();
        if (type === 'profile') {
          setProfileImage(updatedUrl);
        } else {
          setBannerImage(updatedUrl);
        }
        setSuccess('Image mise à jour avec succès !');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Erreur lors de la mise à jour de l\'image');
      }
    } catch (error) {
      setError('Erreur lors de la mise à jour de l\'image');
      console.error('Erreur mise à jour image:', error);
    }
  };

  const handleFileUpload = async (file, type) => {
    if (!file) return;

    if (type === 'profile') {
      setUploadingProfile(true);
    } else {
      setUploadingBanner(true);
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'restaurant-images');
      if (user?.id) formData.append('userId', user.id);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (response.ok && data.imageUrl) {
        // Mettre à jour l'image dans la base de données
        await handleImageUpload(data.imageUrl, type);
      } else {
        setError(data.error || 'Erreur lors de l\'upload de l\'image');
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      setError('Erreur lors de l\'upload de l\'image');
    } finally {
      if (type === 'profile') {
        setUploadingProfile(false);
      } else {
        setUploadingBanner(false);
      }
    }
  };

  const savePrepTime = async ({ closeAfter = false } = {}) => {
    setSavingPrepTime(true);
    setError('');
    setSuccess('');
    try {
      const minutes = parseInt(prepTimeMinutes, 10);
      if (!minutes || Number.isNaN(minutes) || minutes < 5 || minutes > 120) {
        throw new Error('Le temps de préparation doit être entre 5 et 120 minutes.');
      }

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) throw new Error('Session expirée, reconnectez-vous.');

      const res = await fetch(`/api/partner/restaurant/${restaurant.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prep_time_minutes: minutes }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || 'Erreur lors de la mise à jour du temps de préparation.');
      }

      setPrepTimeUpdatedAt(payload?.restaurant?.prep_time_updated_at || new Date().toISOString());
      setSuccess('Temps de préparation mis à jour ✅');
      setTimeout(() => setSuccess(''), 3000);
      if (closeAfter) setShowPrepTimeModal(false);
    } catch (err) {
      setError(err.message || 'Erreur lors de la mise à jour du temps de préparation.');
    } finally {
      setSavingPrepTime(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          ...formData,
          profile_image: profileImage || restaurant.profile_image,
          banner_image: bannerImage || restaurant.banner_image
        })
        .eq('id', restaurant.id);

      if (error) throw error;
      
      setSuccess('Paramètres mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des paramètres');
      console.error('Erreur sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Modal prompt temps de préparation (quotidien) */}
      {showPrepTimeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Temps de préparation du jour</h2>
            <p className="text-gray-600 text-sm mb-4">
              Indiquez un temps moyen de préparation (modifiable pendant le service). Cela sert à afficher une estimation fiable aux clients.
            </p>

            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Temps de préparation (minutes)
            </label>
            <select
              value={prepTimeMinutes}
              onChange={(e) => setPrepTimeMinutes(parseInt(e.target.value, 10))}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 mb-4"
            >
              {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map((m) => (
                <option key={m} value={m}>{m} min</option>
              ))}
            </select>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPrepTimeModal(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 text-gray-700 font-semibold"
                disabled={savingPrepTime}
              >
                Plus tard
              </button>
              <button
                type="button"
                onClick={() => savePrepTime({ closeAfter: true })}
                className="flex-1 px-4 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
                disabled={savingPrepTime}
              >
                {savingPrepTime ? 'Enregistrement…' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Paramètres du restaurant</h1>
              <p className="text-gray-600">{restaurant?.nom}</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retour au dashboard
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
            {success}
          </div>
        )}

        {/* Images du restaurant */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Images du restaurant</h2>
            <p className="text-sm text-gray-600">Gérez votre photo de profil et votre bannière</p>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Photo de profil */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Photo de profil
                </label>
                <div className="space-y-3">
                  <img 
                    src={profileImage || restaurant.profile_image || '/default-restaurant.jpg'} 
                    alt="Photo de profil"
                    className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'profile');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={uploadingProfile}
                    />
                    {uploadingProfile && (
                      <div className="text-sm text-blue-600">Upload en cours...</div>
                    )}
                    <div className="text-sm text-gray-600">Ou utilisez une URL :</div>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        placeholder="https://exemple.com/image.jpg"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImageUpload(e.target.value, 'profile');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const inputs = document.querySelectorAll('input[type="url"]');
                          if (inputs[0] && inputs[0].value) {
                            handleImageUpload(inputs[0].value, 'profile');
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mettre à jour
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bannière */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bannière du restaurant
                </label>
                <div className="space-y-3">
                  <img 
                    src={bannerImage || restaurant.banner_image || '/default-banner.jpg'} 
                    alt="Bannière"
                    className="w-full h-32 object-cover rounded-lg border-2 border-gray-200"
                  />
                  <div className="space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handleFileUpload(file, 'banner');
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={uploadingBanner}
                    />
                    {uploadingBanner && (
                      <div className="text-sm text-blue-600">Upload en cours...</div>
                    )}
                    <div className="text-sm text-gray-600">Ou utilisez une URL :</div>
                    <div className="flex space-x-2">
                      <input
                        type="url"
                        placeholder="https://exemple.com/banner.jpg"
                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleImageUpload(e.target.value, 'banner');
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const inputs = document.querySelectorAll('input[type="url"]');
                          if (inputs[1] && inputs[1].value) {
                            handleImageUpload(inputs[1].value, 'banner');
                          }
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Mettre à jour
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Informations du restaurant */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Informations du restaurant</h2>
            <p className="text-sm text-gray-600">Modifiez les informations de votre restaurant</p>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6">
            {/* Temps de préparation */}
            <div className="mb-8 p-4 bg-orange-50 border border-orange-100 rounded-xl">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Temps de préparation</h3>
              <p className="text-sm text-gray-600 mb-4">
                Ce temps est affiché aux clients comme estimation. Mets-le à jour pendant le service si besoin.
                {prepTimeUpdatedAt ? (
                  <span className="ml-2 text-gray-500">
                    (Dernière mise à jour: {new Date(prepTimeUpdatedAt).toLocaleString('fr-FR')})
                  </span>
                ) : null}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(parseInt(e.target.value, 10))}
                  className="flex-1 border border-gray-300 rounded-xl px-4 py-3"
                >
                  {Array.from({ length: 24 }, (_, i) => (i + 1) * 5).map((m) => (
                    <option key={m} value={m}>{m} min</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => savePrepTime({ closeAfter: false })}
                  className="px-5 py-3 rounded-xl bg-orange-600 text-white font-semibold hover:bg-orange-700 disabled:opacity-50"
                  disabled={savingPrepTime}
                >
                  {savingPrepTime ? 'Enregistrement…' : 'Mettre à jour'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du restaurant
                </label>
                <input
                  type="text"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type de cuisine
                </label>
                <input
                  type="text"
                  name="type_cuisine"
                  value={formData.type_cuisine}
                  onChange={handleChange}
                  placeholder="ex: Italien, Français, Asiatique..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  name="telephone"
                  value={formData.telephone}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  placeholder="Décrivez votre restaurant, vos spécialités..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  name="adresse"
                  value={formData.adresse}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code postal
                </label>
                <input
                  type="text"
                  name="code_postal"
                  value={formData.code_postal}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ville
                </label>
                <input
                  type="text"
                  name="ville"
                  value={formData.ville}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/partner')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sauvegarde...</span>
                  </>
                ) : (
                  <>
                    <FaSave className="h-4 w-4" />
                    <span>Sauvegarder</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 