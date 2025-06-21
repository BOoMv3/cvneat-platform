'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FaCheck, 
  FaClock, 
  FaUtensils, 
  FaMotorcycle, 
  FaHome,
  FaMapMarkerAlt,
  FaPhone,
  FaStar,
  FaHeart,
  FaShare,
  FaDownload,
  FaArrowLeft,
  FaTruck,
  FaUser,
  FaCreditCard
} from 'react-icons/fa';

export default function OrderConfirmation() {
  const { id } = useParams();
  const router = useRouter();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    fetchOrder();
    
    // Polling pour mettre à jour le statut en temps réel
    const interval = setInterval(fetchOrder, 3000); // Vérifier toutes les 3 secondes
    
    // Timer pour le temps écoulé
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    
    return () => {
      clearInterval(interval);
      clearInterval(timer);
    };
  }, [id]);

  const fetchOrder = async () => {
    try {
      const response = await fetch(`/api/orders/${id}`);
      if (!response.ok) {
        throw new Error('Commande non trouvée');
      }
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending':
        return 'En attente d\'acceptation';
      case 'accepted':
        return 'Commande acceptée';
      case 'rejected':
        return 'Commande refusée';
      case 'preparing':
        return 'En cours de préparation';
      case 'ready':
        return 'Prête pour la livraison';
      case 'delivered':
        return 'Livrée';
      default:
        return status;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock className="h-5 w-5" />;
      case 'accepted':
        return <FaCheck className="h-5 w-5" />;
      case 'rejected':
        return <FaCheck className="h-5 w-5" />;
      case 'preparing':
        return <FaUtensils className="h-5 w-5" />;
      case 'ready':
        return <FaMotorcycle className="h-5 w-5" />;
      case 'delivered':
        return <FaHome className="h-5 w-5" />;
      default:
        return <FaClock className="h-5 w-5" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'preparing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'delivered':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getEstimatedTime = () => {
    if (!orderData) return 30;
    
    switch (orderData.status) {
      case 'pending':
        return 35;
      case 'accepted':
        return 30;
      case 'preparing':
        return 20;
      case 'ready':
        return 10;
      default:
        return 0;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadReceipt = () => {
    if (!orderData) return;
    
    const receipt = `
      RECU DE COMMANDE
      =================
      
      Commande #${orderData.id}
      Date: ${new Date(orderData.created_at).toLocaleString('fr-FR')}
      
      Restaurant: ${orderData.restaurants?.name || 'N/A'}
      
      ARTICLES:
      ${orderData.items?.map(item => 
        `${item.name} x${item.quantity} - ${(item.price * item.quantity).toFixed(2)}€`
      ).join('\n')}
      
      Sous-total: ${(orderData.total_amount - orderData.delivery_fee).toFixed(2)}€
      Frais de livraison: ${orderData.delivery_fee.toFixed(2)}€
      TOTAL: ${orderData.total_amount.toFixed(2)}€
      
      Livraison: ${orderData.delivery_address}, ${orderData.delivery_city} ${orderData.delivery_postal_code}
      
      Merci pour votre commande !
    `;
    
    const blob = new Blob([receipt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `commande-${orderData.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Ma commande CVNeat',
        text: `J'ai commandé chez ${orderData.restaurants?.name} ! Commande #${orderData.id}`,
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Lien copié dans le presse-papiers !');
    }
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

  if (error || !orderData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <FaCheck className="h-12 w-12 text-red-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Commande non trouvée</h1>
            <p className="text-gray-600 mb-6">{error || 'Impossible de récupérer les détails de votre commande.'}</p>
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
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Suivi de commande</h1>
                <p className="text-sm text-gray-600">Commande #{orderData.id}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={shareOrder}
                className="text-gray-600 hover:text-blue-600 transition-colors p-2"
                title="Partager"
              >
                <FaShare className="h-4 w-4" />
              </button>
              <button
                onClick={downloadReceipt}
                className="text-gray-600 hover:text-green-600 transition-colors p-2"
                title="Télécharger le reçu"
              >
                <FaDownload className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contenu principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Confirmation */}
            <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <FaCheck className="h-10 w-10 text-green-500" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Commande confirmée !</h1>
              <p className="text-gray-600 mb-6">
                Votre commande #{orderData.id} a été reçue et est en cours de traitement.
              </p>
              
              {/* Statut de la commande */}
              <div className={`inline-flex items-center space-x-2 px-6 py-3 rounded-full text-sm font-semibold border ${getStatusColor(orderData.status)}`}>
                {getStatusIcon(orderData.status)}
                <span>{getStatusText(orderData.status)}</span>
              </div>
            </div>

            {/* Suivi en temps réel */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Suivi en temps réel</h2>
              
              <div className="space-y-6">
                {/* Temps écoulé */}
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <FaClock className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium text-blue-900">Temps écoulé</p>
                      <p className="text-sm text-blue-700">{formatTime(timeElapsed)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-blue-900">Temps estimé</p>
                    <p className="text-sm text-blue-700">{getEstimatedTime()} min</p>
                  </div>
                </div>

                {/* Étapes de la commande */}
                <div className="space-y-4">
                  {[
                    { status: 'pending', label: 'Commande reçue', icon: FaCheck },
                    { status: 'accepted', label: 'Restaurant accepte', icon: FaUtensils },
                    { status: 'preparing', label: 'En préparation', icon: FaUtensils },
                    { status: 'ready', label: 'Prêt pour livraison', icon: FaMotorcycle },
                    { status: 'delivered', label: 'Livré', icon: FaHome }
                  ].map((step, index) => {
                    const isActive = orderData.status === step.status;
                    const isCompleted = ['accepted', 'preparing', 'ready', 'delivered'].includes(orderData.status) && 
                                      ['pending', 'accepted', 'preparing', 'ready', 'delivered'].indexOf(step.status) <= 
                                      ['pending', 'accepted', 'preparing', 'ready', 'delivered'].indexOf(orderData.status);
                    
                    return (
                      <div key={step.status} className="flex items-center space-x-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          isCompleted ? 'bg-green-100 text-green-600' : 
                          isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {isCompleted ? <FaCheck className="h-5 w-5" /> : <step.icon className="h-5 w-5" />}
                        </div>
                        <div className="flex-1">
                          <p className={`font-medium ${isCompleted ? 'text-green-600' : isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                          {isActive && (
                            <p className="text-sm text-gray-500">En cours...</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Détails de la commande */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Détails de la commande</h2>
              
              <div className="space-y-6">
                {/* Restaurant */}
                {orderData.restaurants && (
                  <div className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUtensils className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{orderData.restaurants.name}</h3>
                      <p className="text-gray-600 text-sm mb-2">{orderData.restaurants.description}</p>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center">
                          <FaStar className="h-3 w-3 text-yellow-400 mr-1" />
                          <span>{orderData.restaurants.rating || '4.5'}</span>
                        </div>
                        <div className="flex items-center">
                          <FaClock className="h-3 w-3 mr-1" />
                          <span>{orderData.restaurants.deliveryTime || 30} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Articles */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Articles commandés</h3>
                  <div className="space-y-3">
                    {orderData.items && orderData.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
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
                </div>

                {/* Totaux */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>Sous-total</span>
                    <span>{(orderData.total_amount - orderData.delivery_fee).toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Frais de livraison</span>
                    <span>{orderData.delivery_fee.toFixed(2)}€</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-blue-600">{orderData.total_amount.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="space-y-6">
              {/* Informations de livraison */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations de livraison</h3>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <FaUser className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.customer_name}</p>
                      <p className="text-sm text-gray-600">Client</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <FaPhone className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.customer_phone}</p>
                      <p className="text-sm text-gray-600">Téléphone</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-3">
                    <FaMapMarkerAlt className="h-4 w-4 text-gray-400 mt-1" />
                    <div>
                      <p className="font-medium text-gray-900">{orderData.delivery_address}</p>
                      <p className="text-sm text-gray-600">
                        {orderData.delivery_city} {orderData.delivery_postal_code}
                      </p>
                    </div>
                  </div>
                  
                  {orderData.delivery_instructions && (
                    <div className="flex items-start space-x-3">
                      <FaTruck className="h-4 w-4 text-gray-400 mt-1" />
                      <div>
                        <p className="font-medium text-gray-900">Instructions</p>
                        <p className="text-sm text-gray-600">{orderData.delivery_instructions}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions rapides */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={() => router.push('/')}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold"
                  >
                    Commander à nouveau
                  </button>
                  
                  <button
                    onClick={downloadReceipt}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Télécharger le reçu
                  </button>
                  
                  <button
                    onClick={shareOrder}
                    className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Partager ma commande
                  </button>
                </div>
              </div>

              {/* Support */}
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Besoin d'aide ?</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Notre équipe est là pour vous aider avec votre commande.
                </p>
                <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Contacter le support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 