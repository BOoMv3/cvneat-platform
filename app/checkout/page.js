'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import { safeLocalStorage } from '../../lib/localStorage';
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
import AuthGuard from "../components/AuthGuard";

export default function Checkout() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [user, setUser] = useState(null);
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
    checkAuthAndLoadCart();
  }, []);

  const checkAuthAndLoadCart = async () => {
    try {
      // Verifier l'authentification
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Vous devez etre connecte pour passer une commande');
        router.push('/login');
        return;
      }
      setUser(user);

      // Charger le panier
      const cartData = safeLocalStorage.getJSON('cart');
      if (cartData) {
        setCart(cartData.items || []);
        setRestaurant(cartData.restaurant);
      } else {
        setError('Aucun panier trouve');
      }
    } catch (error) {
      setError('Erreur lors du chargement');
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
          items: cart,
          deliveryFee: getDeliveryFee(),
          totalAmount: getTotal()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la creation de la commande');
      }

      const data = await response.json();
      
      // Vider le panier
      safeLocalStorage.removeItem('cart');
      
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
    // Recuperer les frais de livraison depuis le panier sauvegarde
    const cartData = safeLocalStorage.getJSON('cart');
    return cartData?.frais_livraison || restaurant?.frais_livraison || 2.50;
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
    <AuthGuard>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Finaliser la commande</h1>
        {/* Le contenu de la page de paiement ira ici */}
        <p>Le processus de paiement est en cours de construction.</p>
      </div>
    </AuthGuard>
  );
} 