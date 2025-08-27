'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaShoppingCart, FaSpinner, FaArrowLeft, FaHeart, FaStar, FaClock, FaMotorcycle, FaSearch } from 'react-icons/fa';

// Composant pour la section du menu simplifié
const MenuSection = ({ restaurantId, restaurant, onAddToCart }) => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState({}); // Pour gérer les suppléments et tailles

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
        if (!response.ok) {
          throw new Error('Le menu n\'est pas disponible pour le moment.');
        }
        const data = await response.json();
        
        // Ajouter des données de test pour les suppléments et boissons
        const enhancedData = data.map(item => {
          // Simuler des boissons avec tailles
          if (item.category === 'Boissons' || item.nom?.toLowerCase().includes('coca') || item.nom?.toLowerCase().includes('café')) {
            return {
              ...item,
              is_drink: true,
              drink_price_small: (item.prix || 0) * 0.8,
              drink_price_medium: item.prix || 0,
              drink_price_large: (item.prix || 0) * 1.3
            };
          }
          
          // Simuler des plats avec suppléments
          if (item.category === 'Plats' || item.nom?.toLowerCase().includes('pizza') || item.nom?.toLowerCase().includes('burger')) {
            return {
              ...item,
              supplements: [
                {
                  id: 'supp1',
                  nom: 'Fromage supplémentaire',
                  prix: 1.50,
                  disponible: true
                },
                {
                  id: 'supp2',
                  nom: 'Bacon',
                  prix: 2.00,
                  disponible: true
                },
                {
                  id: 'supp3',
                  nom: 'Sauce spéciale',
                  prix: 0.80,
                  disponible: true
                }
              ]
            };
          }
          
          return item;
        });
        
        setMenu(enhancedData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId]);

  const handleAddToCart = (item, supplements = [], size = null) => {
    console.log("Ajout au panier:", item, supplements, size);
    
    // Récupérer le panier actuel depuis le localStorage
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Créer l'article avec suppléments et taille
    const cartItem = {
      id: item.id,
      nom: item.nom || item.name,
      prix: calculateFinalPrice(item, supplements, size),
      quantity: 1,
      restaurant_id: restaurantId,
      restaurant_name: restaurant?.nom || restaurant?.name,
      restaurant_address: restaurant?.adresse || restaurant?.address,
      image_url: item.image_url,
      supplements: supplements,
      size: size,
      base_price: item.prix || item.price
    };
    
    // Vérifier si l'article existe déjà dans le panier
    const existingItemIndex = currentCart.findIndex(cartItem => 
      cartItem.id === item.id && 
      cartItem.restaurant_id === restaurantId &&
      JSON.stringify(cartItem.supplements) === JSON.stringify(supplements) &&
      cartItem.size === size
    );
    
    if (existingItemIndex !== -1) {
      // Incrémenter la quantité
      currentCart[existingItemIndex].quantity += 1;
    } else {
      // Ajouter un nouvel article
      currentCart.push(cartItem);
    }
    
    // Sauvegarder le panier mis à jour
    localStorage.setItem('cart', JSON.stringify(currentCart));
    
    // Notification de succès
    const supplementText = supplements.length > 0 ? ` avec ${supplements.length} supplément(s)` : '';
    const sizeText = size ? ` (${size})` : '';
    alert(`${item.nom || item.name}${sizeText}${supplementText} ajouté au panier !`);
  };

  const calculateFinalPrice = (item, supplements, size) => {
    let basePrice = item.prix || item.price || 0;
    
    // Ajouter le prix de la taille pour les boissons
    if (size && item.is_drink) {
      switch (size) {
        case 'small':
          basePrice = item.drink_price_small || basePrice;
          break;
        case 'medium':
          basePrice = item.drink_price_medium || basePrice;
          break;
        case 'large':
          basePrice = item.drink_price_large || basePrice;
          break;
        default:
          break;
      }
    }
    
    // Ajouter le prix des suppléments
    const supplementsPrice = supplements.reduce((total, supplement) => total + (supplement.prix || 0), 0);
    
    return basePrice + supplementsPrice;
  };

  const handleItemSelection = (itemId, supplements, size) => {
    setSelectedItems(prev => ({
      ...prev,
      [itemId]: { supplements, size }
    }));
  };

  if (loading) {
    return <div className="text-center p-4"><FaSpinner className="animate-spin text-orange-500 mx-auto text-2xl" /></div>;
  }

  if (error) {
    return <p className="text-red-500 text-center p-4">{error}</p>;
  }
  
  // Grouper le menu par catégorie
  const groupedMenu = menu.reduce((acc, item) => {
    const category = item.category || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Filtrer le menu par recherche
  const filteredMenu = Object.entries(groupedMenu).reduce((acc, [category, items]) => {
    const filteredItems = items.filter(item => 
      item.nom?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    if (filteredItems.length > 0) {
      acc[category] = filteredItems;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Barre de recherche du menu */}
      <div className="bg-white rounded-2xl p-4 shadow-lg">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Rechercher dans le menu..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-200"
          />
        </div>
      </div>

      {/* Menu groupé par catégorie */}
      {Object.entries(filteredMenu).map(([category, items]) => (
        <div key={category} className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 border-b-2 border-orange-200 pb-2 flex items-center">
            <span className="mr-2">🍽️</span>
            {category}
          </h2>
          <div className="space-y-6">
            {items.map(item => (
              <div key={item.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">{item.nom || item.name}</h3>
                    {item.description && (
                      <p className="text-gray-600 mt-1 text-sm leading-relaxed">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 ml-4">
                    <span className="font-bold text-orange-600 text-lg">
                      {typeof item.prix === 'number' ? item.prix.toFixed(2) : 'Prix non disponible'}€
                    </span>
                  </div>
                </div>

                {/* Gestion des tailles pour les boissons */}
                {item.is_drink && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center">
                      🥤 Choisir la taille :
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {item.drink_price_small && (
                        <button
                          onClick={() => handleItemSelection(item.id, selectedItems[item.id]?.supplements || [], 'small')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedItems[item.id]?.size === 'small'
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                              : 'bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          Petit ({item.drink_price_small.toFixed(2)}€)
                        </button>
                      )}
                      {item.drink_price_medium && (
                        <button
                          onClick={() => handleItemSelection(item.id, selectedItems[item.id]?.supplements || [], 'medium')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedItems[item.id]?.size === 'medium'
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                              : 'bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          Moyen ({item.drink_price_medium.toFixed(2)}€)
                        </button>
                      )}
                      {item.drink_price_large && (
                        <button
                          onClick={() => handleItemSelection(item.id, selectedItems[item.id]?.supplements || [], 'large')}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            selectedItems[item.id]?.size === 'large'
                              ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg'
                              : 'bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50'
                          }`}
                        >
                          Grand ({item.drink_price_large.toFixed(2)}€)
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Gestion des suppléments */}
                {item.supplements && item.supplements.length > 0 && (
                  <div className="mb-4 p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-sm font-semibold text-green-800 mb-2 flex items-center">
                      🧀 Suppléments disponibles :
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.supplements.map(supplement => (
                        <label key={supplement.id} className="flex items-center space-x-3 cursor-pointer p-2 rounded-lg hover:bg-green-100 transition-colors">
                          <input
                            type="checkbox"
                            checked={(selectedItems[item.id]?.supplements || []).some(s => s.id === supplement.id)}
                            onChange={(e) => {
                              const currentSupplements = selectedItems[item.id]?.supplements || [];
                              let newSupplements;
                              if (e.target.checked) {
                                newSupplements = [...currentSupplements, supplement];
                              } else {
                                newSupplements = currentSupplements.filter(s => s.id !== supplement.id);
                              }
                              handleItemSelection(item.id, newSupplements, selectedItems[item.id]?.size);
                            }}
                            className="w-5 h-5 text-purple-600 border-2 border-green-300 rounded focus:ring-purple-500 focus:ring-2"
                          />
                          <span className="text-sm font-medium text-green-800">{supplement.nom}</span>
                          <span className="text-sm font-bold text-green-600">+{supplement.prix.toFixed(2)}€</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bouton d'ajout au panier */}
                <div className="flex justify-end">
                  <button 
                    onClick={() => {
                      const currentSelection = selectedItems[item.id] || { supplements: [], size: null };
                      onAddToCart(item, currentSelection.supplements, currentSelection.size);
                    }}
                    className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-xl hover:from-orange-600 hover:to-amber-700 transition-all duration-200 transform hover:scale-105 shadow-lg font-medium"
                  >
                    <FaShoppingCart className="inline-block mr-2 h-4 w-4" />
                    Ajouter au panier
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function RestaurantPage({ params }) {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); // Pour l'animation d'ajout au panier
  const [showCartNotification, setShowCartNotification] = useState(false); // Pour la notification

  useEffect(() => {
    const fetchRestaurant = async () => {
      try {
        const response = await fetch(`/api/restaurants/${params.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors du chargement du restaurant');
        }
        
        setRestaurant(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchRestaurant();
    } else {
      setError('ID du restaurant manquant');
      setLoading(false);
    }
  }, [params.id]);

  const handleToggleFavorite = () => {
    setIsFavorite(!isFavorite);
    // TODO: Implémenter la logique de favoris avec Supabase
    alert(isFavorite ? 'Retiré des favoris' : 'Ajouté aux favoris');
  };

  const handleAddToCartWithAnimation = (item, supplements = [], size = null) => {
    // Animation d'ajout au panier
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));
    
    // Appeler la fonction originale
    handleAddToCart(item, supplements, size);
    
    // Notification de succès
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 2000);
    
    // Arrêter l'animation après un délai
    setTimeout(() => {
      setAddingToCart(prev => ({ ...prev, [item.id]: false }));
    }, 500);
  };

  // Fonction pour ajouter au panier (logique simplifiée)
  const handleAddToCart = (item, supplements = [], size = null) => {
    console.log("Ajout au panier:", item, supplements, size);
    
    // Récupérer le panier actuel depuis le localStorage
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Créer l'article avec suppléments et taille
    const cartItem = {
      id: item.id,
      nom: item.nom || item.name,
      prix: calculateFinalPrice(item, supplements, size),
      quantity: 1,
      restaurant_id: params.id,
      restaurant_name: restaurant?.nom || restaurant?.name,
      restaurant_address: restaurant?.adresse || restaurant?.address,
      image_url: item.image_url,
      supplements: supplements,
      size: size,
      base_price: item.prix || item.price
    };
    
    // Vérifier si l'article existe déjà dans le panier
    const existingItemIndex = currentCart.findIndex(cartItem => 
      cartItem.id === item.id && 
      cartItem.restaurant_id === params.id &&
      JSON.stringify(cartItem.supplements) === JSON.stringify(supplements) &&
      cartItem.size === size
    );
    
    if (existingItemIndex !== -1) {
      // Incrémenter la quantité
      currentCart[existingItemIndex].quantity += 1;
    } else {
      // Ajouter un nouvel article
      currentCart.push(cartItem);
    }
    
    // Sauvegarder le panier mis à jour
    localStorage.setItem('cart', JSON.stringify(currentCart));
    
    // Notification de succès
    const supplementText = supplements.length > 0 ? ` avec ${supplements.length} supplément(s)` : '';
    const sizeText = size ? ` (${size})` : '';
    console.log(`${item.nom || item.name}${sizeText}${supplementText} ajouté au panier !`);
  };

  const calculateFinalPrice = (item, supplements, size) => {
    let basePrice = item.prix || item.price || 0;
    
    // Ajouter le prix de la taille pour les boissons
    if (size && item.is_drink) {
      switch (size) {
        case 'small':
          basePrice = item.drink_price_small || basePrice;
          break;
        case 'medium':
          basePrice = item.drink_price_medium || basePrice;
          break;
        case 'large':
          basePrice = item.drink_price_large || basePrice;
          break;
        default:
          break;
      }
    }
    
    // Ajouter le prix des suppléments
    const supplementsPrice = supplements.reduce((total, supplement) => total + (supplement.prix || 0), 0);
    
    return basePrice + supplementsPrice;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-orange-200 border-t-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du restaurant...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">⚠️</span>
          </div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Restaurant non trouvé</h1>
          <button 
            onClick={() => router.push('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header avec navigation */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => router.push('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-orange-600 transition-colors"
            >
              <FaArrowLeft className="h-5 w-5" />
              <span className="font-medium">Retour</span>
            </button>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleToggleFavorite}
                className={`p-3 rounded-full transition-all duration-200 ${
                  isFavorite 
                    ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <FaHeart className={`h-5 w-5 ${isFavorite ? 'fill-current' : ''}`} />
              </button>
              
              <Link 
                href="/panier"
                className="p-3 bg-orange-100 text-orange-600 rounded-full hover:bg-orange-200 transition-colors"
              >
                <FaShoppingCart className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Bannière du restaurant */}
      <div className="relative h-[300px] lg:h-[400px] overflow-hidden">
        <Image
          src={restaurant.image_url || restaurant.imageUrl || '/default-restaurant.jpg'}
          alt={restaurant.nom || restaurant.name}
          fill
          className="object-cover"
          unoptimized
        />
        
        {/* Overlay avec gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
        
        {/* Informations du restaurant */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-lg">
              {restaurant.nom || restaurant.name}
            </h1>
            <p className="text-white/90 text-lg mb-4 max-w-2xl drop-shadow-lg">
              {restaurant.description}
            </p>
            
            {/* Stats du restaurant */}
            <div className="flex flex-wrap items-center space-x-6 text-white/90">
              <div className="flex items-center space-x-2">
                <FaStar className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold">{restaurant.rating || '4.5'}</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaClock className="h-5 w-5" />
                <span>{restaurant.deliveryTime || '25-35'} min</span>
              </div>
              <div className="flex items-center space-x-2">
                <FaMotorcycle className="h-5 w-5" />
                <span>À partir de {restaurant.frais_livraison || restaurant.deliveryFee || 2.50}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notification d'ajout au panier */}
      {showCartNotification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <FaShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Article ajouté au panier !</span>
          </div>
        </div>
      )}

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MenuSection restaurantId={params.id} restaurant={restaurant} onAddToCart={handleAddToCartWithAnimation} />
      </div>
    </div>
  );
} 