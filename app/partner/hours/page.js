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
      
      // Initialiser les horaires avec les données existantes ou par défaut
      // Support pour plusieurs plages horaires (ex: midi et soir)
      const defaultHoraires = {};
      joursSemaine.forEach(jour => {
        const existingHoraire = resto.horaires?.[jour.key];
        if (existingHoraire && Array.isArray(existingHoraire.plages)) {
          // Format nouveau avec plages multiples
          defaultHoraires[jour.key] = existingHoraire;
        } else if (existingHoraire && existingHoraire.ouverture) {
          // Format ancien avec une seule plage - convertir
          defaultHoraires[jour.key] = {
            ouvert: existingHoraire.ouvert || false,
            plages: existingHoraire.ouvert ? [{
              ouverture: existingHoraire.ouverture || '09:00',
              fermeture: existingHoraire.fermeture || '22:00'
            }] : []
          };
        } else {
          // Par défaut
          defaultHoraires[jour.key] = {
            ouvert: false,
            plages: []
          };
        }
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

  const handlePlageChange = (jour, index, champ, value) => {
    setHoraires(prev => {
      const newPlages = [...(prev[jour]?.plages || [])];
      newPlages[index] = {
        ...newPlages[index],
        [champ]: value
      };
      return {
        ...prev,
        [jour]: {
          ...prev[jour],
          plages: newPlages,
          ouvert: newPlages.length > 0 && newPlages.some(p => p.ouverture && p.fermeture)
        }
      };
    });
  };

  const addPlage = (jour) => {
    setHoraires(prev => {
      const newPlages = [...(prev[jour]?.plages || []), {
        ouverture: '11:30',
        fermeture: '14:30'
      }];
      return {
        ...prev,
        [jour]: {
          ...prev[jour],
          plages: newPlages,
          ouvert: true
        }
      };
    });
  };

  const removePlage = (jour, index) => {
    setHoraires(prev => {
      const newPlages = prev[jour]?.plages?.filter((_, i) => i !== index) || [];
      return {
        ...prev,
        [jour]: {
          ...prev[jour],
          plages: newPlages,
          ouvert: newPlages.length > 0
        }
      };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      // Vérifier que le restaurant existe
      if (!restaurant || !restaurant.id) {
        throw new Error('Restaurant non trouvé');
      }

      // Nettoyer et valider les horaires avant sauvegarde
      // Nouveau format avec plages multiples
      const cleanedHoraires = {};
      joursSemaine.forEach(jour => {
        const horaire = horaires[jour.key];
        if (horaire && horaire.plages && Array.isArray(horaire.plages) && horaire.plages.length > 0) {
          // Filtrer les plages valides (avec ouverture et fermeture)
          const validPlages = horaire.plages.filter(p => p.ouverture && p.fermeture);
          cleanedHoraires[jour.key] = {
            ouvert: validPlages.length > 0,
            plages: validPlages
          };
        } else {
          cleanedHoraires[jour.key] = {
            ouvert: false,
            plages: []
          };
        }
      });

      console.log('Horaires à sauvegarder:', cleanedHoraires);

      // Sauvegarder dans Supabase
      const { data, error } = await supabase
        .from('restaurants')
        .update({ 
          horaires: cleanedHoraires,
          updated_at: new Date().toISOString()
        })
        .eq('id', restaurant.id)
        .select('horaires');

      if (error) {
        console.error('Erreur Supabase:', error);
        throw new Error(error.message || 'Erreur lors de la sauvegarde');
      }

      if (!data || data.length === 0) {
        throw new Error('Aucune donnée retournée après la mise à jour');
      }

      console.log('Horaires sauvegardées avec succès:', data[0].horaires);

      // Mettre à jour l'état local avec les données sauvegardées
      setRestaurant({ ...restaurant, horaires: data[0].horaires });
      
      setSuccess('Horaires mis à jour avec succès !');
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Erreur complète sauvegarde horaires:', err);
      setError(err.message || 'Erreur lors de la sauvegarde des horaires. Veuillez réessayer.');
      setTimeout(() => setError(''), 5000);
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded mb-6 flex items-center">
            <FaTimes className="mr-2 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-400 px-4 py-3 rounded mb-6 flex items-center">
            <FaCheck className="mr-2 flex-shrink-0" />
            <span>{success}</span>
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
                    <div className="space-y-4">
                      {/* Afficher les plages horaires existantes */}
                      {(horaires[jour.key]?.plages || []).map((plage, index) => (
                        <div key={index} className="border rounded-lg p-4 bg-gray-50">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-gray-700">
                              Plage horaire {index + 1}
                            </span>
                            {(horaires[jour.key]?.plages || []).length > 1 && (
                              <button
                                onClick={() => removePlage(jour.key, index)}
                                className="text-red-600 hover:text-red-800 text-sm"
                              >
                                Supprimer
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Heure d'ouverture
                              </label>
                              <input
                                type="time"
                                value={plage.ouverture || '09:00'}
                                onChange={(e) => handlePlageChange(jour.key, index, 'ouverture', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Heure de fermeture
                              </label>
                              <input
                                type="time"
                                value={plage.fermeture || '22:00'}
                                onChange={(e) => handlePlageChange(jour.key, index, 'fermeture', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {/* Bouton pour ajouter une plage supplémentaire */}
                      <button
                        onClick={() => addPlage(jour.key)}
                        className="w-full px-4 py-2 border-2 border-dashed border-gray-300 rounded-md text-gray-600 hover:border-blue-500 hover:text-blue-600 transition-colors"
                      >
                        + Ajouter une plage horaire (ex: soir)
                      </button>
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
                    {horaires[jour.key]?.ouvert && horaires[jour.key]?.plages?.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        {horaires[jour.key].plages.map((plage, idx) => (
                          <span key={idx}>
                            {plage.ouverture} - {plage.fermeture}
                          </span>
                        ))}
                      </div>
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