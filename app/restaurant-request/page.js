'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FaArrowLeft } from 'react-icons/fa';
import FormInput from '../../components/FormInput';
import { supabase } from '../../lib/supabase';

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
    ville: '',
    password: '' // Mot de passe pour création de compte si non connecté
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
        if (!error && user) {
          // Utilisateur connecté
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
        }
        // Si pas connecté, on laisse l'utilisateur remplir le formulaire avec création de compte
      } catch (error) {
        console.error('Erreur vérification auth:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      let currentUser = user;
      
      // Si l'utilisateur n'est pas connecté, créer un compte automatiquement
      if (!currentUser) {
        // Vérifier que le mot de passe est fourni
        if (!formData.password || formData.password.length < 6) {
          throw new Error('Le mot de passe est requis et doit contenir au moins 6 caractères');
        }
        
        // Vérifier que l'email n'existe pas déjà
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', formData.email)
          .single();
        
        if (existingUser) {
          throw new Error('Cet email est déjà utilisé. Veuillez vous connecter avec ce compte.');
        }
        
        // Créer le compte utilisateur
        const baseSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.cvneat.fr';
        const normalizedSiteUrl = baseSiteUrl.endsWith('/') ? baseSiteUrl.slice(0, -1) : baseSiteUrl;
        const signUpOptions = {
          data: {
            nom: formData.nom,
            prenom: '',
            telephone: formData.telephone
          }
        };
        if (normalizedSiteUrl) {
          signUpOptions.emailRedirectTo = `${normalizedSiteUrl}/auth/confirm`;
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: signUpOptions
        });
        
        if (signUpError) {
          throw new Error(signUpError.message || 'Erreur lors de la création du compte');
        }
        
        if (!authData.user) {
          throw new Error('Impossible de créer le compte');
        }
        
        currentUser = authData.user;
        
        // Créer l'entrée dans la table users
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: currentUser.id,
              email: formData.email,
              nom: formData.nom,
              telephone: formData.telephone,
              role: 'user' // Rôle par défaut, sera changé en 'partner' si la demande est approuvée
            }
          ]);
        
        if (userError && !userError.message.includes('duplicate')) {
          console.warn('Erreur création profil utilisateur:', userError);
          // Continuer quand même, le profil peut être créé automatiquement par un trigger
        }
        
        // Connecter l'utilisateur
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        });
        
        if (signInError) {
          console.warn('Erreur connexion automatique:', signInError);
          // Continuer quand même, l'utilisateur peut se connecter manuellement
        } else {
          setUser(currentUser);
        }
      }
      
      // Vérifier à nouveau l'utilisateur avant la soumission
      if (!currentUser) {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        currentUser = verifiedUser;
      }
      
      if (!currentUser) {
        throw new Error('Impossible de vérifier votre compte. Veuillez réessayer.');
      }
      
      // Vérifier que l'utilisateur existe dans la table users et attendre qu'il soit créé
      let userExists = null;
      let attempts = 0;
      const maxAttempts = 5;
      
      while (attempts < maxAttempts) {
        const { data: userCheck, error: userCheckError } = await supabase
          .from('users')
          .select('id')
          .eq('id', currentUser.id)
          .single();
        
        if (userCheck && !userCheckError) {
          userExists = userCheck;
          break;
        }
        
        // Si l'utilisateur n'existe pas, essayer de le créer
        if (userCheckError || !userCheck) {
          console.warn(`⚠️ Utilisateur non trouvé (tentative ${attempts + 1}/${maxAttempts}), création du profil...`);
          const { error: createUserError } = await supabase
            .from('users')
            .insert([
              {
                id: currentUser.id,
                email: formData.email,
                nom: formData.nom,
                telephone: formData.telephone,
                role: 'user'
              }
            ])
            .select()
            .single();
          
          if (!createUserError || createUserError.message.includes('duplicate')) {
            // Attendre un peu pour que la transaction soit commitée
            await new Promise(resolve => setTimeout(resolve, 500));
            attempts++;
            continue;
          } else {
            console.error('❌ Erreur création profil utilisateur:', createUserError);
            // Continuer quand même, le profil peut être créé automatiquement par un trigger
            break;
          }
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Vérifier s'il existe déjà une demande avec cet email
      const { data: existingRequest } = await supabase
        .from('restaurant_requests')
        .select('id, email')
        .eq('email', formData.email)
        .single();
      
      if (existingRequest) {
        throw new Error('Une demande existe déjà avec cet email. Veuillez contacter le support si vous souhaitez modifier votre demande.');
      }
      
      // Préparer les données d'insertion
      const requestData = {
        nom: formData.nom,
        email: formData.email,
        telephone: formData.telephone,
        adresse: formData.adresse,
        description: formData.description,
        code_postal: formData.code_postal,
        ville: formData.ville,
        status: 'pending'
      };
      
      // Ajouter user_id seulement si l'utilisateur existe dans la table users
      let data, error;
      
      try {
        // Essayer d'abord avec user_id si l'utilisateur existe
        const insertData = userExists 
          ? { ...requestData, user_id: currentUser.id }
          : requestData;
        
        const result = await supabase
          .from('restaurant_requests')
          .insert([insertData])
          .select()
          .single();
        
        data = result.data;
        error = result.error;
        
        // Gérer différents types d'erreurs
        if (error) {
          const errorMessage = error.message || error.toString();
          const errorCode = error.code || '';
          const errorDetails = error.details || '';
          const errorHint = error.hint || '';
          
          console.error('❌ Erreur insertion détaillée:', {
            message: errorMessage,
            code: errorCode,
            details: errorDetails,
            hint: errorHint
          });
          
          // Si erreur de colonne manquante, clé étrangère, ou violation de contrainte unique
          if (errorCode === '23503' || // Foreign key violation
              errorCode === '23505' || // Unique constraint violation
              errorMessage.includes('column') && errorMessage.includes('user_id') ||
              errorMessage.includes('foreign key') ||
              errorMessage.includes('violates foreign key') ||
              errorMessage.includes('violate key') ||
              errorMessage.includes('duplicate key') ||
              errorMessage.includes('unique constraint')) {
            
            console.warn('⚠️ Erreur liée à user_id ou contrainte unique, insertion sans user_id...');
            
            // Réessayer sans user_id
            const resultWithoutUserId = await supabase
              .from('restaurant_requests')
              .insert([requestData])
              .select()
              .single();
            
            data = resultWithoutUserId.data;
            error = resultWithoutUserId.error;
            
            if (error) {
              const fallbackErrorMessage = error.message || error.toString();
              const fallbackErrorCode = error.code || '';
              console.error('❌ Erreur insertion sans user_id:', {
                message: fallbackErrorMessage,
                code: fallbackErrorCode,
                details: error.details,
                hint: error.hint
              });
              
              // Si c'est une contrainte unique sur l'email
              if (fallbackErrorCode === '23505' || fallbackErrorMessage.includes('unique constraint') || fallbackErrorMessage.includes('duplicate key')) {
                throw new Error('Une demande existe déjà avec cet email. Veuillez contacter le support.');
              }
              
              throw new Error(`Erreur lors de la création de la demande: ${fallbackErrorMessage}${fallbackErrorCode ? ` (Code: ${fallbackErrorCode})` : ''}`);
            } else {
              console.log('✅ Demande créée sans user_id');
            }
          } else {
            // Autre type d'erreur
            throw new Error(`Erreur lors de la création de la demande: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}${errorDetails ? ` - ${errorDetails}` : ''}`);
          }
        }
      } catch (insertError) {
        console.error('❌ Exception lors de l\'insertion:', insertError);
        const errorMessage = insertError.message || insertError.toString();
        
        // Si erreur de contrainte de clé étrangère ou violation de clé, réessayer sans user_id
        if (errorMessage.includes('foreign key') ||
            errorMessage.includes('violates foreign key') ||
            errorMessage.includes('violate key') ||
            errorMessage.includes('duplicate key') ||
            errorMessage.includes('unique constraint') ||
            (errorMessage.includes('column') && errorMessage.includes('user_id'))) {
          
          console.warn('⚠️ Erreur clé/violation détectée, insertion sans user_id...');
          try {
            const resultWithoutUserId = await supabase
              .from('restaurant_requests')
              .insert([requestData])
              .select()
              .single();
            
            data = resultWithoutUserId.data;
            error = resultWithoutUserId.error;
            
            if (error) {
              const fallbackErrorMessage = error.message || error.toString();
              if (fallbackErrorMessage.includes('unique constraint') || fallbackErrorMessage.includes('duplicate key')) {
                throw new Error('Une demande existe déjà avec cet email. Veuillez contacter le support.');
              }
              throw new Error(`Erreur lors de la création de la demande: ${fallbackErrorMessage}`);
            }
          } catch (fallbackError) {
            throw new Error(`Impossible de créer la demande: ${fallbackError.message || fallbackError.toString()}`);
          }
        } else {
          throw new Error(`Erreur lors de la création de la demande: ${errorMessage}`);
        }
      }

      if (error) {
        const errorMessage = error.message || error.toString();
        const errorCode = error.code || '';
        throw new Error(`Erreur lors de la création de la demande: ${errorMessage}${errorCode ? ` (Code: ${errorCode})` : ''}`);
      }

      setSubmitSuccess(true);
      setShowConfirmationModal(false);
      setFormData({
        nom: '',
        email: '',
        telephone: '',
        adresse: '',
        description: '',
        code_postal: '',
        ville: '',
        password: ''
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

  // Afficher le formulaire même si l'utilisateur n'est pas connecté (création de compte automatique)

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
            
            {user ? (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>✅ Vous êtes connecté en tant que :</strong> {user.email}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  Votre demande sera liée à votre compte CVN'EAT.
                </p>
              </div>
            ) : (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                <p className="text-sm text-orange-800 dark:text-orange-200">
                  <strong>ℹ️ Création de compte automatique</strong>
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                  Un compte CVN'EAT sera créé automatiquement avec votre email. Vous pourrez vous connecter avec le mot de passe que vous allez définir.
                </p>
              </div>
            )}
            
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
                    disabled={!!user}
                    className={user ? "bg-gray-100 dark:bg-gray-700 cursor-not-allowed" : ""}
                  />
                  {user ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      L'email est automatiquement rempli avec votre compte CVN'EAT.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Cet email sera utilisé pour créer votre compte CVN'EAT.
                    </p>
                  )}
                  
                  {!user && (
                    <>
                      <FormInput
                        label="Mot de passe"
                        type="password"
                        name="password"
                        placeholder="Minimum 6 caractères"
                        required
                        error={errors.password}
                        value={formData.password}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Ce mot de passe vous permettra de vous connecter à votre compte CVN'EAT.
                      </p>
                    </>
                  )}

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