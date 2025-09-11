'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { safeLocalStorage } from '../../lib/localStorage';
import { 
  FaArrowLeft, 
  FaTrash, 
  FaPlus, 
  FaMinus, 
  FaShoppingCart,
  FaClock,
  FaMotorcycle,
  FaStar,
  FaHeart,
  FaMapMarkerAlt,
  FaPhone,
  FaUtensils
} from 'react-icons/fa';

export default function Panier() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = () => {
    try {
      const cartData = safeLocalStorage.getJSON('cart');
      if (cartData) {
        setCart(cartData.items || []);
        setRestaurant(cartData.restaurant);
      }
    } catch (error) {
      console.error('Erreur lors du chargement du panier:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }

    setIsUpdating(true);
    try {
      const updatedCart = cart.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      );
      setCart(updatedCart);
      saveCart(updatedCart);
      
      // Animation de feedback
      await new Promise(resolve => setTimeout(resolve, 100));
    } finally {
      setIsUpdating(false);
    }
  };

  const removeFromCart = (itemId) => {
    const updatedCart = cart.filter(item => item.id !== itemId);
    setCart(updatedCart);
    saveCart(updatedCart);
  };

  const saveCart = (updatedCart) => {
    const cartData = {
      items: updatedCart,
      restaurant: restaurant,
      frais_livraison: restaurant?.frais_livraison || 2.50
    };
    safeLocalStorage.setJSON('cart', cartData);
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

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Votre panier est vide');
      return;
    }
    router.push('/checkout');
  };

  const clearCart = () => {
    if (confirm('Etes-vous sur de vouloir vider votre panier ?')) {
      setCart([]);
      safeLocalStorage.removeItem('cart');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de votre panier...</p>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <FaShoppingCart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">Votre panier est vide</h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6 sm:mb-8 max-w-md mx-auto">
            Découvrez nos délicieux restaurants et commencez à commander vos plats préférés !
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <button
              onClick={() => router.push('/')}
              className="bg-blue-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold min-h-[44px] touch-manipulation text-sm sm:text-base"
            >
              Découvrir nos restaurants
            </button>
            <button
              onClick={() => router.push('/restaurants')}
              className="bg-white text-blue-600 border-2 border-blue-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg hover:bg-blue-50 transition-all duration-200 font-semibold min-h-[44px] touch-manipulation text-sm sm:text-base"
            >
                Voir tous les restaurants
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <button
                onClick={() => router.push('/')}
                className="text-gray-600 hover:text-gray-900 transition-colors min-h-[44px] touch-manipulation"
              >
                <FaArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Mon Panier</h1>
                <p className="text-xs sm:text-sm text-gray-600">{getItemCount()} article{getItemCount() !== 1 ? 's' : ''}</p>
              </div>
            </div>
            
            <button
              onClick={clearCart}
              className="text-red-600 hover:text-red-700 transition-colors flex items-center justify-center space-x-2 min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              <FaTrash className="h-4 w-4" />
              <span className="text-sm">Vider le panier</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Liste des articles */}
          <div className="lg:col-span-2">
            {/* Informations restaurant */}
            {restaurant && (
              <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 mb-4 sm:mb-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FaUtensils className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 mb-1 sm:mb-2 truncate">{restaurant.nom}</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3 line-clamp-2">{restaurant.description}</p>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500">
                      <div className="flex items-center">
                        <FaStar className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400 mr-1" />
                        <span>{restaurant.rating || '4.5'}</span>
                      </div>
                      <div className="flex items-center">
                        <FaClock className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                      <div className="flex items-center">
                        <FaMotorcycle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span>{restaurant.frais_livraison ? `${restaurant.frais_livraison}€` : 'Gratuit'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Articles du panier */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <div className="p-4 sm:p-6 border-b">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Articles commandés</h3>
              </div>
              
              <div className="divide-y divide-gray-100">
                {cart.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-6 hover:bg-gray-50 transition-colors"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="flex-shrink-0">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              width={60}
                              height={60}
                              className="rounded-lg object-cover sm:w-20 sm:h-20"
                            />
                          ) : (
                            <div className="w-15 h-15 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-blue-200 rounded-lg flex items-center justify-center">
                              <span className="text-lg sm:text-2xl">🍽️</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 truncate">{item.name}</h4>
                          <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 line-clamp-2">{item.description}</p>
                          <p className="text-base sm:text-lg font-bold text-blue-600">{item.price}€</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4">
                        {/* Contrôles quantité */}
                        <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            disabled={isUpdating}
                            className="px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation"
                          >
                            <FaMinus className="h-3 w-3" />
                          </button>
                          <span className="px-3 sm:px-4 py-2 border-x border-gray-200 font-semibold text-gray-900 min-w-[2.5rem] sm:min-w-[3rem] text-center text-sm sm:text-base">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            disabled={isUpdating}
                            className="px-2 sm:px-3 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors disabled:opacity-50 min-h-[44px] touch-manipulation"
                          >
                            <FaPlus className="h-3 w-3" />
                          </button>
                        </div>
                        
                        <div className="text-right">
                          <p className="font-bold text-base sm:text-lg text-gray-900">
                            {(item.price * item.quantity).toFixed(2)}€
                          </p>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm flex items-center justify-end space-x-1 mt-1 min-h-[44px] touch-manipulation"
                          >
                            <FaTrash className="h-3 w-3" />
                            <span>Supprimer</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Résumé de commande */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border p-4 sm:p-6 sticky top-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Résumé de commande</h3>
              
              <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>Sous-total ({getItemCount()} article{getItemCount() !== 1 ? 's' : ''})</span>
                  <span>{getSubtotal().toFixed(2)}€</span>
                </div>
                
                <div className="flex justify-between text-gray-600 text-sm sm:text-base">
                  <span>Frais de livraison</span>
                  <span>{getDeliveryFee().toFixed(2)}€</span>
                </div>
                
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-base sm:text-lg font-semibold text-gray-900">Total</span>
                    <span className="text-xl sm:text-2xl font-bold text-blue-600">{getTotal().toFixed(2)}€</span>
                  </div>
                </div>
              </div>

              {/* Informations de livraison */}
              <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                  <FaClock className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                  <span className="font-medium text-blue-900 text-sm sm:text-base">Temps de livraison estimé</span>
                </div>
                <p className="text-xs sm:text-sm text-blue-700">
                  {restaurant?.deliveryTime || 30} minutes
                </p>
              </div>

              {/* Boutons d'action */}
              <div className="space-y-2 sm:space-y-3">
                <button
                  onClick={handleCheckout}
                  className="w-full bg-blue-600 text-white py-3 sm:py-4 rounded-lg hover:bg-blue-700 transition-all duration-200 transform hover:scale-105 font-semibold text-sm sm:text-base min-h-[44px] touch-manipulation"
                >
                  Passer la commande
                </button>
                
                <button
                  onClick={() => router.push('/')}
                  className="w-full bg-gray-100 text-gray-700 py-2 sm:py-3 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm sm:text-base min-h-[44px] touch-manipulation"
                >
                  Continuer mes achats
                </button>
              </div>

              {/* Informations supplémentaires */}
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
                <div className="text-xs text-gray-500 space-y-1 sm:space-y-2">
                  <p>• Livraison sécurisée et tracée</p>
                  <p>• Paiement sécurisé</p>
                  <p>• Satisfaction garantie</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 