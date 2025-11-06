'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import FormInput from '../../components/FormInput';
import { supabase } from '../../lib/supabase';
import AuthGuard from '../../components/AuthGuard';

export default function RestaurantRequest() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
    description: '',
    code_postal: '',
    ville: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          // Rediriger vers la page de connexion avec un message
          router.push('/login?redirect=/restaurant-request&message=Veuillez vous connecter pour faire une demande de partenariat');
          return;
        }
        setUser(user);
        
        // Pré-remplir l'email avec l'email de l'utilisateur connecté
        const { data: userData } = await supabase
          .from('users')
          .select('email, nom, prenom, telephone')
          .eq('id', user.id)
          .single();
        
        if (userData) {
          setFormData(prev => ({
            ...prev,
            email: userData.email || user.email || '',
            nom: userData.nom || userData.prenom || ''
          }));
        }
      } catch (error) {
        console.error('Erreur vérification auth:', error);
        router.push('/login?redirect=/restaurant-request&message=Veuillez vous connecter pour faire une demande de partenariat');
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier que l'utilisateur est connecté
    if (!user) {
      setErrors({ submit: 'Vous devez être connecté pour soumettre une demande' });
      router.push('/login?redirect=/restaurant-request&message=Veuillez vous connecter pour faire une demande de partenariat');
      return;
    }
    
    setIsSubmitting(true);
    setErrors({});

    try {
      // Vérifier à nouveau l'authentification avant la soumission
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      const { data, error } = await supabase
        .from('restaurant_requests')
        .insert([
          {
            ...formData,
            user_id: currentUser.id, // Lier la demande à l'utilisateur connecté
            email: currentUser.email || formData.email, // Utiliser l'email de l'utilisateur connecté
            status: 'pending',
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;

      setSubmitSuccess(true);
      setShowConfirmationModal(false);
      setFormData({
        nom: '',
        email: '',
        telephone: '',
        adresse: '',
        description: '',
        code_postal: '',
        ville: ''
      });
    } catch (error) {
      setErrors({ submit: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Afficher un loader pendant la vérification de l'authentification
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Vérification de l'authentification...</p>
        </div>
      </main>
    );
  }

  // Si pas d'utilisateur, ne rien afficher (redirection en cours)
  if (!user) {
    return null;
  }

  return (
    <>
      <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white mb-6 transition-colors"
            >
              <FaArrowLeft className="mr-2" />
              Retour
            </button>
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Devenir Partenaire CVN-EAT</h1>
            
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>✅ Vous êtes connecté en tant que :</strong> {user.email}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                Votre demande sera liée à votre compte CVN'EAT.
              </p>
            </div>
            
            {submitSuccess ? (
              <div className="text-center">
                <div className="mb-4 text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">Demande soumise avec succès !</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Nous avons bien reçu votre demande. Notre équipe va l'examiner et vous contactera dans les plus brefs délais.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => router.push('/')}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition-colors font-medium"
                  >
                    Retour à l'accueil
                  </button>
                  <button
                    onClick={() => setSubmitSuccess(false)}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors font-medium"
                  >
                    Soumettre une nouvelle demande
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
                  Remplissez le formulaire ci-dessous pour soumettre votre demande de partenariat. 
                  Notre équipe vous contactera pour discuter des modalités de collaboration.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <FormInput
                    label="Nom du restaurant"
                    name="nom"
                    placeholder="Le nom de votre restaurant"
                    required
                    error={errors.nom}
                    value={formData.nom}
                    onChange={handleChange}
                  />

                  <FormInput
                    label="Email"
                    type="email"
                    name="email"
                    placeholder="votre@email.com"
                    required
                    error={errors.email}
                    value={formData.email}
                    onChange={handleChange}
                    disabled={true}
                    className="bg-gray-100 dark:bg-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    L'email est automatiquement rempli avec votre compte CVN'EAT.
                  </p>

                  <FormInput
                    label="Téléphone"
                    type="tel"
                    name="telephone"
                    placeholder="06 12 34 56 78"
                    required
                    error={errors.telephone}
                    value={formData.telephone}
                    onChange={handleChange}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput
                      label="Code Postal"
                      name="code_postal"
                      placeholder="75001"
                      required
                      error={errors.code_postal}
                      value={formData.code_postal}
                      onChange={handleChange}
                    />

                    <FormInput
                      label="Ville"
                      name="ville"
                      placeholder="Paris"
                      required
                      error={errors.ville}
                      value={formData.ville}
                      onChange={handleChange}
                    />
                  </div>

                  <FormInput
                    label="Adresse"
                    name="adresse"
                    placeholder="Adresse complète du restaurant"
                    required
                    error={errors.adresse}
                    value={formData.adresse}
                    onChange={handleChange}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows="4"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Décrivez votre restaurant, votre cuisine, vos spécialités..."
                      value={formData.description}
                      onChange={handleChange}
                    />
                  </div>

                  {errors.submit && (
                    <div className="text-red-600 text-sm">{errors.submit}</div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Modal de confirmation */}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Demande soumise avec succès !
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Nous avons bien reçu votre demande. Notre équipe va l'examiner et vous contactera dans les plus brefs délais.
              </p>
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setSubmitSuccess(true);
                }}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 