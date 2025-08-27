'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FaShoppingCart, FaSpinner, FaArrowLeft, FaHeart, FaStar, FaClock, FaMotorcycle, FaSearch } from 'react-icons/fa';

// Composant pour la section du menu simplifié
const MenuSection = ({ restaurantId, restaurant }) => {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchMenu = async () => {
      if (!restaurantId) return;
      try {
        const response = await fetch(`/api/restaurants/${restaurantId}/menu`);
        if (!response.ok) {
          throw new Error('Le menu n\'est pas disponible pour le moment.');
        }
        const data = await response.json();
        setMenu(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [restaurantId]);

  const handleAddToCart = (item) => {
    console.log("Ajout au panier:", item);
    
    // Récupérer le panier actuel depuis le localStorage
    const currentCart = JSON.parse(localStorage.getItem('cart') || '[]');
    
    // Vérifier si l'article existe déjà dans le panier
    const existingItemIndex = currentCart.findIndex(cartItem => 
      cartItem.id === item.id && cartItem.restaurant_id === restaurantId
    );
    
    if (existingItemIndex !== -1) {
      // Incrémenter la quantité
      currentCart[existingItemIndex].quantity += 1;
    } else {
      // Ajouter un nouvel article
      const cartItem = {
        id: item.id,
        nom: item.nom || item.name,
        prix: item.prix || item.price,
        quantity: 1,
        restaurant_id: restaurantId,
        restaurant_name: restaurant?.nom || restaurant?.name,
        restaurant_address: restaurant?.adresse || restaurant?.address,
        image_url: item.image_url
      };
      currentCart.push(cartItem);
    }
    
    // Sauvegarder le panier mis à jour
    localStorage.setItem('cart', JSON.stringify(currentCart));
    
    // Notification de succès
    alert(`${item.nom || item.name} ajouté au panier !`);
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
          <div className="space-y-4">
            {items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 rounded-lg px-3 transition-colors duration-200">
                <div className="flex-1">
                  <div className="flex items-start justify-between">
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
                      <button 
                        onClick={() => handleAddToCart(item)}
                        className="bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full p-3 hover:from-orange-600 hover:to-red-600 transition-all duration-200 transform hover:scale-105 shadow-lg"
                        aria-label={`Ajouter ${item.nom || item.name} au panier`}
                      >
                        <FaShoppingCart className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
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

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <MenuSection restaurantId={params.id} restaurant={restaurant} />
      </div>
    </div>
  );
} 