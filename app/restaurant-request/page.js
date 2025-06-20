'use client';
import { useState } from 'react';
import FormInput from '../../components/FormInput';
import { supabase } from '../../lib/supabase';

export default function RestaurantRequest() {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const { data, error } = await supabase
        .from('restaurant_requests')
        .insert([
          {
            ...formData,
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

  return (
    <>
      <main className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h1 className="text-3xl font-bold text-center mb-8">Devenir Partenaire CVN-EAT</h1>
            
            {submitSuccess ? (
              <div className="text-center">
                <div className="mb-4 text-green-600">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold mb-2">Demande soumise avec succès !</h2>
                <p className="text-gray-600 mb-4">
                  Nous avons bien reçu votre demande. Notre équipe va l'examiner et vous contactera dans les plus brefs délais.
                </p>
                <button
                  onClick={() => setSubmitSuccess(false)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Soumettre une nouvelle demande
                </button>
              </div>
            ) : (
              <>
                <p className="text-gray-600 mb-8 text-center">
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
                  />

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