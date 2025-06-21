'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { 
  FaClock, 
  FaSave, 
  FaTimes,
  FaCheck
} from 'react-icons/fa';

const joursSemaine = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' }
];

export default function PartnerHours() {
  const [user, setUser] = useState(null);
  const [restaurant, setRestaurant] = useState(null);
  const [horaires, setHoraires] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
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

      if (userError || !userData || userData.role !== 'restaurant') {
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
      
      // Initialiser les horaires avec les données existantes ou par défaut
      const defaultHoraires = {};
      joursSemaine.forEach(jour => {
        defaultHoraires[jour.key] = resto.horaires?.[jour.key] || {
          ouvert: false,
          ouverture: '09:00',
          fermeture: '22:00'
        };
      });
      
      setHoraires(defaultHoraires);
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const handleHoraireChange = (jour, champ, value) => {
    setHoraires(prev => ({
      ...prev,
      [jour]: {
        ...prev[jour],
        [champ]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { error } = await supabase
        .from('restaurants')
        .update({ horaires })
        .eq('id', restaurant.id);

      if (error) throw error;

      setSuccess('Horaires mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Erreur lors de la sauvegarde des horaires');
      console.error('Erreur sauvegarde horaires:', err);
    } finally {
      setSaving(false);
    }
  };

  const copyHoraires = (jourSource) => {
    const horairesSource = horaires[jourSource];
    const newHoraires = { ...horaires };
    
    joursSemaine.forEach(jour => {
      if (jour.key !== jourSource) {
        newHoraires[jour.key] = { ...horairesSource };
      }
    });
    
    setHoraires(newHoraires);
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gestion des horaires</h1>
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

        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">Horaires d'ouverture</h2>
            <p className="text-sm text-gray-600">Configurez vos horaires d'ouverture pour chaque jour de la semaine</p>
          </div>
          
          <div className="p-6">
            <div className="space-y-6">
              {joursSemaine.map((jour) => (
                <div key={jour.key} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={horaires[jour.key]?.ouvert || false}
                        onChange={(e) => handleHoraireChange(jour.key, 'ouvert', e.target.checked)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="text-lg font-medium text-gray-900">
                        {jour.label}
                      </label>
                    </div>
                    
                    {horaires[jour.key]?.ouvert && (
                      <button
                        onClick={() => copyHoraires(jour.key)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Copier vers tous les jours
                      </button>
                    )}
                  </div>

                  {horaires[jour.key]?.ouvert && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Heure d'ouverture
                        </label>
                        <input
                          type="time"
                          value={horaires[jour.key]?.ouverture || '09:00'}
                          onChange={(e) => handleHoraireChange(jour.key, 'ouverture', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Heure de fermeture
                        </label>
                        <input
                          type="time"
                          value={horaires[jour.key]?.fermeture || '22:00'}
                          onChange={(e) => handleHoraireChange(jour.key, 'fermeture', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {!horaires[jour.key]?.ouvert && (
                    <div className="text-sm text-gray-500 italic">
                      Fermé ce jour
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end space-x-4">
              <button
                onClick={() => router.push('/partner')}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
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
          </div>
        </div>

        {/* Aperçu des horaires */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Aperçu des horaires</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {joursSemaine.map((jour) => (
                <div key={jour.key} className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-900">{jour.label}</span>
                  <span className="text-sm text-gray-600">
                    {horaires[jour.key]?.ouvert ? (
                      `${horaires[jour.key]?.ouverture} - ${horaires[jour.key]?.fermeture}`
                    ) : (
                      <span className="text-red-500">Fermé</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 