'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FaArrowLeft, 
  FaUser, 
  FaPhone, 
  FaMapMarkerAlt, 
  FaCreditCard,
  FaLock,
  FaCheck,
  FaClock,
  FaMotorcycle,
  FaStar,
  FaUtensils,
  FaShieldAlt,
  FaTruck
} from 'react-icons/fa';

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postalCode: '',
    instructions: '',
    paymentMethod: 'card'
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const cartData = localStorage.getItem('cart');
      if (cartData) {
        const parsed = JSON.parse(cartData);
        setCart(parsed.items || []);
        setRestaurant(parsed.restaurant);
      } else {
        setError('Aucun panier trouvé');
      }
    } catch (error) {
      setError('Erreur lors du chargement du panier');
    } finally {
      setLoading(false);
    }
  };

  const validateField = (name, value) => {
    const errors = {};
    
    switch (name) {
      case 'name':
        if (!value.trim()) errors.name = 'Le nom est requis';
        else if (value.length < 2) errors.name = 'Le nom doit contenir au moins 2 caractères';
        break;
      case 'email':
        if (!value.trim()) errors.email = 'L\'email est requis';
        else if (!/\S+@\S+\.\S+/.test(value)) errors.email = 'Format d\'email invalide';
        break;
      case 'phone':
        if (!value.trim()) errors.phone = 'Le téléphone est requis';
        else if (!/^[0-9+\s-()]{10,}$/.test(value)) errors.phone = 'Format de téléphone invalide';
        break;
      case 'address':
        if (!value.trim()) errors.address = 'L\'adresse est requise';
        break;
      case 'city':
        if (!value.trim()) errors.city = 'La ville est requise';
        break;
      case 'postalCode':
        if (!value.trim()) errors.postalCode = 'Le code postal est requis';
        else if (!/^[0-9]{5}$/.test(value)) errors.postalCode = 'Code postal invalide';
        break;
    }
    
    return errors;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Validation en temps réel
    const fieldErrors = validateField(name, value);
    setFormErrors(prev => ({
      ...prev,
      [name]: fieldErrors[name]
    }));
  };

  const validateForm = () => {
    const errors = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'instructions') {
        const fieldErrors = validateField(key, formData[key]);
        if (fieldErrors[key]) errors[key] = fieldErrors[key];
      }
    });
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const nextStep = () => {
    if (validateForm()) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          deliveryInfo: formData,
          items: cart
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la création de la commande');
      }

      const data = await response.json();
      
      // Vider le panier
      localStorage.removeItem('cart');
      
      // Rediriger vers la confirmation
      router.push(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getDeliveryFee = () => {
    return restaurant?.frais_livraison || 0;
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const getItemCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre commande...</p>
        </div>
      </div>
    );
  }

  if (error || !cart.length || !restaurant) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaShieldAlt className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Erreur</h1>
            <p className="text-gray-600 mb-6">{error || 'Panier ou restaurant introuvable'}</p>
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105"
            >
              Retour à l'accueil
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Finaliser la commande</h1>
                <p className="text-sm text-gray-600">Étape {currentStep} sur 2</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <FaLock className="h-4 w-4" />
              <span>Paiement sécurisé</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulaire principal */}
          <div className="lg:col-span-2">
            {/* Étapes */}
            <div className="bg-white rounded-xl shadow-sm border p-6 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 1 ? <FaCheck className="h-4 w-4" /> : '1'}
                  </div>
                  <span className={currentStep >= 1 ? 'text-blue-600 font-semibold' : 'text-gray-600'}>
                    Informations de livraison
                  </span>
                </div>
                
                <div className="flex-1 mx-4 h-px bg-gray-200"></div>
                
                <div className="flex items-center space-x-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > 2 ? <FaCheck className="h-4 w-4" /> : '2'}
                  </div>
                  <span className={currentStep >= 2 ? 'text-blue-600 font-semibold' : 'text-gray-600'}>
                    Paiement
                  </span>
                </div>
              </div>
            </div>

            {/* Étape 1: Informations de livraison */}
            {currentStep === 1 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Informations de livraison</h2>
                
                <form className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaUser className="h-4 w-4 inline mr-2" />
                        Nom complet *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.name ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Votre nom complet"
                      />
                      {formErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <FaPhone className="h-4 w-4 inline mr-2" />
                        Téléphone *
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.phone ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="06 12 34 56 78"
                      />
                      {formErrors.phone && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.phone}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <FaMapMarkerAlt className="h-4 w-4 inline mr-2" />
                      Adresse de livraison *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        formErrors.address ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="123 Rue de la Paix"
                    />
                    {formErrors.address && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ville *
                      </label>
                      <input
                        type="text"
                        name="city"
                        value={formData.city}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.city ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Paris"
                      />
                      {formErrors.city && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.city}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Code postal *
                      </label>
                      <input
                        type="text"
                        name="postalCode"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formErrors.postalCode ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="75001"
                      />
                      {formErrors.postalCode && (
                        <p className="text-red-500 text-sm mt-1">{formErrors.postalCode}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions de livraison
                    </label>
                    <textarea
                      name="instructions"
                      value={formData.instructions}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Code, étage, instructions spéciales..."
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={nextStep}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold"
                    >
                      Continuer vers le paiement
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Étape 2: Paiement */}
            {currentStep === 2 && (
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Méthode de paiement</h2>
                
                {error && (
                  <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        checked={formData.paymentMethod === 'card'}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <FaCreditCard className="h-5 w-5 text-blue-600" />
                      <div>
                        <div className="font-medium">Carte bancaire</div>
                        <div className="text-sm text-gray-600">Visa, Mastercard, American Express</div>
                      </div>
                    </label>

                    <label className="flex items-center space-x-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="cash"
                        checked={formData.paymentMethod === 'cash'}
                        onChange={handleInputChange}
                        className="text-blue-600"
                      />
                      <FaTruck className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="font-medium">Paiement à la livraison</div>
                        <div className="text-sm text-gray-600">Espèces ou carte à la livraison</div>
                      </div>
                    </label>
                  </div>

                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <FaLock className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-900">Paiement sécurisé</span>
                    </div>
                    <p className="text-sm text-blue-700">
                      Vos informations de paiement sont protégées par un chiffrement SSL de niveau bancaire.
                    </p>
                  </div>

                  <div className="flex justify-between">
                    <button
                      type="button"
                      onClick={prevStep}
                      className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Traitement...</span>
                        </div>
                      ) : (
                        `Payer ${getTotal().toFixed(2)}€`
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Résumé de commande */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Résumé de commande</h3>
              
              {/* Informations restaurant */}
              {restaurant && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUtensils className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{restaurant.nom}</h4>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <FaStar className="h-3 w-3 text-yellow-400" />
                        <span>{restaurant.rating || '4.5'}</span>
                        <FaClock className="h-3 w-3" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Articles */}
              <div className="space-y-3 mb-6">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-600">x{item.quantity}</p>
                    </div>
                    <p className="font-semibold text-gray-900">
                      {(item.price * item.quantity).toFixed(2)}€
                    </p>
                  </div>
                ))}
              </div>

              {/* Totaux */}
              <div className="border-t pt-4 space-y-3">
                <div className="flex justify-between text-gray-600">
                  <span>Sous-total ({getItemCount()} article{getItemCount() !== 1 ? 's' : ''})</span>
                  <span>{getSubtotal().toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between text-gray-600">
                  <span>Frais de livraison</span>
                  <span>{getDeliveryFee().toFixed(2)}€</span>
                </div>
                
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-2xl font-bold text-blue-600">{getTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Informations de livraison */}
              <div className="mt-6 pt-6 border-t">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <FaClock className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-900">Livraison estimée</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {restaurant?.deliveryTime || 30} minutes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 