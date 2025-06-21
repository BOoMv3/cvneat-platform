"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { 
  FaUser, 
  FaGift, 
  FaHistory, 
  FaSignOutAlt, 
  FaEdit,
  FaStar,
  FaShoppingBag,
  FaCalendarAlt
} from 'react-icons/fa';

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [points, setPoints] = useState(0);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    nom: '',
    prenom: '',
    telephone: '',
    adresse: ''
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/login');
      return;
    }

    setUser(user);
    await fetchUserData(user.id);
  };

  const fetchUserData = async (userId) => {
    try {
      // Récupérer les données utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (userError) throw userError;

      setUserData(userData);
      setFormData({
        nom: userData.nom || '',
        prenom: userData.prenom || '',
        telephone: userData.telephone || '',
        adresse: userData.adresse || ''
      });

      // Récupérer les points de fidélité
      const response = await fetch(`/api/users/points?userId=${userId}`);
      const pointsData = await response.json();

      if (response.ok) {
        setPoints(pointsData.points);
        setHistorique(pointsData.historique || []);
      }
    } catch (error) {
      console.error('Erreur récupération données:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase
        .from('users')
        .update(formData)
        .eq('id', user.id);

      if (error) throw error;

      setEditing(false);
      await fetchUserData(user.id);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      alert('Erreur lors de la mise à jour du profil');
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FaUser className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {userData?.prenom} {userData?.nom}
                </h1>
                <p className="text-gray-600">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center space-x-2 px-4 py-2 text-red-600 hover:text-red-700 transition-colors"
            >
              <FaSignOutAlt className="h-4 w-4" />
              <span>Déconnexion</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Informations personnelles */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Informations personnelles</h2>
                <button
                  onClick={() => setEditing(!editing)}
                  className="flex items-center space-x-2 px-3 py-1 text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <FaEdit className="h-4 w-4" />
                  <span>{editing ? 'Annuler' : 'Modifier'}</span>
                </button>
              </div>

              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                      <input
                        type="text"
                        value={formData.prenom}
                        onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                      <input
                        type="text"
                        value={formData.nom}
                        onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                    <input
                      type="tel"
                      value={formData.telephone}
                      onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <textarea
                      value={formData.adresse}
                      onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleUpdateProfile}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Sauvegarder
                    </button>
                    <button
                      onClick={() => setEditing(false)}
                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Prénom</p>
                      <p className="font-medium">{userData?.prenom || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Nom</p>
                      <p className="font-medium">{userData?.nom || 'Non renseigné'}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Téléphone</p>
                    <p className="font-medium">{userData?.telephone || 'Non renseigné'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adresse</p>
                    <p className="font-medium">{userData?.adresse || 'Non renseignée'}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Historique des points */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <FaHistory className="h-5 w-5 mr-2" />
                Historique des points de fidélité
              </h2>

              {historique.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FaGift className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun historique de points pour le moment</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {historique.slice(-10).reverse().map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          entry.points > 0 ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {entry.points > 0 ? (
                            <FaStar className="h-4 w-4 text-green-600" />
                          ) : (
                            <FaShoppingBag className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{entry.raison}</p>
                          <p className="text-sm text-gray-500 flex items-center">
                            <FaCalendarAlt className="h-3 w-3 mr-1" />
                            {formatDate(entry.date)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${entry.points > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.points > 0 ? '+' : ''}{entry.points} points
                        </p>
                        <p className="text-sm text-gray-500">Total: {entry.total_apres}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Points de fidélité */}
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-sm border p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <FaGift className="h-8 w-8" />
                <span className="text-2xl font-bold">{points}</span>
              </div>
              <h3 className="text-lg font-semibold mb-2">Points de fidélité</h3>
              <p className="text-yellow-100 text-sm">
                Gagnez des points à chaque commande et utilisez-les pour des réductions !
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Comment ça marche ?</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 font-bold text-xs">1</span>
                  </div>
                  <p className="text-gray-600">Gagnez 1 point pour chaque euro dépensé</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 font-bold text-xs">2</span>
                  </div>
                  <p className="text-gray-600">100 points = 5€ de réduction</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-purple-600 font-bold text-xs">3</span>
                  </div>
                  <p className="text-gray-600">Utilisez vos points lors du checkout</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 