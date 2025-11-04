'use client';
import { useState } from 'react';
import Navbar from '@/components/Navbar';
import PaymentForm from '@/components/PaymentForm';
import { FaCreditCard, FaCheckCircle, FaClock, FaEye, FaEuroSign, FaImage, FaLink, FaUser, FaEnvelope, FaPhone } from 'react-icons/fa';

export default function AdvertisePage() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image_url: '',
    link_url: '',
    position: 'banner_middle',
    start_date: '',
    end_date: '',
    advertiser_name: '',
    advertiser_email: '',
    advertiser_phone: ''
  });
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);

  const positions = [
    { 
      value: 'banner_middle', 
      label: 'Milieu de page (recommandé)', 
      price: 50,
      description: 'Espace principal entre les catégories et restaurants',
      popular: true
    },
    { 
      value: 'footer', 
      label: 'Bas de page', 
      price: 15,
      description: 'En bas de la page d\'accueil'
    }
  ];

  const selectedPosition = positions.find(p => p.value === formData.position);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const selectedPosition = positions.find(p => p.value === formData.position);
      
      // Créer le PaymentIntent Stripe
      const response = await fetch('/api/payments/create-ad-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          price: selectedPosition.price
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Stocker les données et afficher le formulaire de paiement
        setPaymentIntentId(result.paymentIntentId);
        setClientSecret(result.clientSecret);
        setShowPaymentForm(true);
        setStep(2); // Passer à l'étape de paiement
      } else {
        throw new Error(result.error || 'Erreur lors de la création du paiement');
      }
    } catch (error) {
      console.error('Erreur lors du paiement:', error);
      alert(`Erreur lors du paiement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    try {
      setLoading(true);
      
      const selectedPosition = positions.find(p => p.value === formData.position);
      
      // Confirmer le paiement et créer la publicité
      const confirmResponse = await fetch('/api/payments/confirm-ad-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentIntentId,
          ...formData,
          price: selectedPosition.price
        }),
      });

      const confirmResult = await confirmResponse.json();

      if (confirmResponse.ok) {
        setStep(3); // Page de confirmation
      } else {
        throw new Error(confirmResult.error || 'Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Erreur après paiement:', error);
      alert(`Paiement réussi mais erreur lors de la création de la publicité: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Erreur paiement:', error);
    alert(`Erreur de paiement: ${error}`);
    setShowPaymentForm(false);
    setLoading(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  if (step === 3) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Publicité commandée !</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
              Votre publicité a été envoyée pour validation. Vous recevrez un email de confirmation sous 24h.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Prochaines étapes :</h3>
              <ul className="text-left text-blue-800 dark:text-blue-200 space-y-1">
                <li>• Validation de votre contenu par notre équipe</li>
                <li>• Email de confirmation avec les détails</li>
                <li>• Mise en ligne de votre publicité</li>
                <li>• Suivi des performances</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.href = '/'}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />
      
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Publicisez votre entreprise
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Augmentez votre visibilité et attirez plus de clients avec nos espaces publicitaires ciblés
          </p>
        </div>

        {/* Étapes */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              1
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              2
            </div>
            <div className={`w-16 h-1 ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
            <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              3
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Formulaire */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
              {step === 1 ? 'Choisissez votre position' : 'Informations de votre publicité'}
            </h2>

            {step === 1 ? (
              <div className="space-y-4">
                {positions.map((position) => (
                  <div
                    key={position.value}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                      formData.position === position.value
                        ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    } ${position.popular ? 'ring-2 ring-yellow-400 dark:ring-yellow-500' : ''}`}
                    onClick={() => setFormData({...formData, position: position.value})}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{position.label}</h3>
                          {position.popular && (
                            <span className="bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs px-2 py-1 rounded-full">
                              Populaire
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{position.description}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{position.price}€</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">par mois</div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                >
                  Continuer
                </button>
              </div>
            ) : showPaymentForm && clientSecret ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white flex items-center">
                  <FaCreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
                  Paiement
                </h3>
                <PaymentForm
                  amount={selectedPosition.price}
                  paymentIntentId={paymentIntentId}
                  clientSecret={clientSecret}
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                />
                <button
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentIntentId(null);
                    setClientSecret(null);
                  }}
                  className="w-full mt-4 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100"
                >
                  Annuler et retourner
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titre de votre publicité *
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de l'image *
                    </label>
                    <input
                      type="url"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL de destination
                    </label>
                    <input
                      type="url"
                      name="link_url"
                      value={formData.link_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date de début
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date de fin
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Nom de l'entreprise *
                    </label>
                    <input
                      type="text"
                      name="advertiser_name"
                      value={formData.advertiser_name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      name="advertiser_email"
                      value={formData.advertiser_email}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      name="advertiser_phone"
                      value={formData.advertiser_phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-semibold"
                  >
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
                  >
                    {loading ? 'Traitement...' : 'Payer et commander'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Récapitulatif */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Récapitulatif</h3>
            
            {selectedPosition && (
              <div className="space-y-4">
                <div className="border-b dark:border-gray-700 pb-4">
                  <h4 className="font-medium text-gray-900 dark:text-white">{selectedPosition.label}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{selectedPosition.description}</p>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    {selectedPosition.price}€/mois
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <FaEye className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">Visibilité maximale sur la page d'accueil</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaClock className="h-4 w-4 text-blue-500" />
                    <span className="text-gray-700 dark:text-gray-300">Affichage 24h/24</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <FaCheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-gray-700 dark:text-gray-300">Validation rapide sous 24h</span>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Inclus :</h5>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Mise en ligne immédiate après validation</li>
                    <li>• Statistiques de clics et vues</li>
                    <li>• Support client dédié</li>
                    <li>• Modification possible du contenu</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
