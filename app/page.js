'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { safeLocalStorage } from '../lib/localStorage';
import { 
  FaSearch, 
  FaStar, 
  FaClock, 
  FaMotorcycle, 
  FaFilter, 
  FaHeart,
  FaShoppingCart,
  FaTimes,
  FaPlus,
  FaMinus,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaGift,
  FaFire,
  FaLeaf,
  FaUtensils,
  FaPizzaSlice,
  FaHamburger,
  FaCoffee,
  FaIceCream
} from 'react-icons/fa';
import AdBanner from '@/components/AdBanner';


// Desactiver le rendu statique pour cette page
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function Home() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [addingToCart, setAddingToCart] = useState({}); // Pour l'animation d'ajout au panier
  const [showCartNotification, setShowCartNotification] = useState(false); // Pour la notification d'ajout

  // Catégories de restaurants avec icônes et couleurs
  const categories = [
    { id: 'all', name: 'Tous', icon: FaUtensils, color: 'from-orange-500 to-amber-600' },
    { id: 'pizza', name: 'Pizza', icon: FaPizzaSlice, color: 'from-red-500 to-orange-500' },
    { id: 'burger', name: 'Burgers', icon: FaHamburger, color: 'from-amber-500 to-orange-500' },
    { id: 'coffee', name: 'Café', icon: FaCoffee, color: 'from-amber-600 to-yellow-600' },
    { id: 'dessert', name: 'Desserts', icon: FaIceCream, color: 'from-pink-400 to-orange-400' },
    { id: 'healthy', name: 'Healthy', icon: FaLeaf, color: 'from-green-500 to-emerald-500' },
    { id: 'fast', name: 'Fast Food', icon: FaFire, color: 'from-orange-500 to-red-500' }
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Verifier l'authentification
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        try {
          const { data: userData } = await supabase
            .from('users')
            .select('points_fidelite')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            setUserPoints(userData.points_fidelite || 0);
          }
        } catch (error) {
          console.error('Erreur recuperation points:', error);
        }
      }
    };

    checkAuth();

    const fetchRestaurants = async () => {
      try {
        const response = await fetch('/api/restaurants');
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.message || 'Erreur lors du chargement des restaurants');
        }
        
        if (!Array.isArray(data)) {
          throw new Error('Format de donnees invalide');
        }
        
        setRestaurants(data);
      } catch (error) {
        console.error('Erreur lors du chargement des restaurants:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleToggleFavorite = async (restaurant) => {
    // TODO: Réactiver après application de la migration SQL
    alert('Fonctionnalité des favoris temporairement désactivée. Appliquez d\'abord la migration SQL sur Supabase.');
    return;
  };

  const handleAddToCart = (restaurant) => {
    // Animation d'ajout au panier
    setAddingToCart(prev => ({ ...prev, [restaurant.id]: true }));
    
    // Ajouter au panier (logique simplifiée pour l'instant)
    const newCartItem = {
      id: restaurant.id,
      nom: restaurant.nom,
      prix: 15.00, // Prix par défaut
      quantity: 1,
      restaurant_id: restaurant.id,
      restaurant_name: restaurant.nom,
      image_url: restaurant.imageUrl
    };
    
    setCart(prev => [...prev, newCartItem]);
    
    // Notification de succès
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 2000);
    
    // Arrêter l'animation après un délai
    setTimeout(() => {
      setAddingToCart(prev => ({ ...prev, [restaurant.id]: false }));
    }, 500);
  };

  const handleRestaurantClick = (restaurant) => {
    router.push(`/restaurants/${restaurant.id}`);
  };

  const filteredAndSortedRestaurants = restaurants.filter(restaurant => {
    const matchesSearch = restaurant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         restaurant.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating || 0) - (a.rating || 0);
      case 'delivery_time':
        return (a.deliveryTime || 0) - (b.deliveryTime || 0);
      case 'distance':
        return (a.distance || 0) - (b.distance || 0);
      default:
        return 0;
    }
  });

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section avec bannière et image de base */}
      <section className="relative h-[600px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
          alt="Bannière de restauration"
          fill
          className="object-cover"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        
        {/* Logo CVN'EAT en haut à gauche */}
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                  <FaUtensils className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white shadow-md animate-pulse"></div>
              <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent tracking-tight">
                CVN'EAT
              </span>
              <span className="text-xs text-gray-500 -mt-1 font-medium">Excellence culinaire</span>
            </div>
          </div>
        </div>
        
        {/* Actions utilisateur en haut à droite */}
        <div className="absolute top-4 right-4 z-20 flex items-center space-x-4">
          {user ? (
            <>
              <div className="flex items-center space-x-2 bg-white/20 backdrop-blur-sm px-3 py-2 rounded-full">
                <FaGift className="text-yellow-400" />
                <span className="text-white text-sm font-medium">{userPoints} pts</span>
              </div>
              <Link href="/profile" className="bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors">
                <FaUser className="h-5 w-5 text-white" />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-white/30 transition-colors">
                <FaSignInAlt className="h-5 w-5 inline mr-2" />
                Connexion
              </Link>
              <Link href="/register" className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-white hover:bg-white/30 transition-colors">
                <FaUserPlus className="h-5 w-5 inline mr-2" />
                Inscription
              </Link>
            </>
          )}
          
          {/* Panier flottant */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowFloatingCart(!showFloatingCart)}
              className="relative bg-white/20 backdrop-blur-sm p-2 rounded-full hover:bg-white/30 transition-colors"
            >
              <FaShoppingCart className="h-5 w-5 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {cart.length}
              </span>
            </button>
          )}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Découvrez les meilleurs restaurants
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Livraison rapide et repas délicieux à votre porte
            </p>

            {/* Barre de recherche intégrée */}
            <div className="bg-white rounded-xl p-4 shadow-lg max-w-lg">
              <div className="flex items-center space-x-3">
                <FaSearch className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom du restaurant, cuisine, plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border-none outline-none text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Panier flottant */}
      {showFloatingCart && cart.length > 0 && (
        <div className="fixed top-24 right-6 bg-white rounded-3xl shadow-2xl border border-gray-200 p-6 z-50 min-w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Votre panier</h3>
            <button
              onClick={() => setShowFloatingCart(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FaTimes className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="flex-1 font-medium text-gray-800">{item.nom}</span>
                <div className="flex items-center space-x-3">
                  <button className="w-8 h-8 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors">
                    <FaMinus className="h-3 w-3 text-gray-600" />
                  </button>
                  <span className="w-10 text-center font-semibold text-gray-900">{item.quantity || 1}</span>
                  <button className="w-8 h-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center hover:from-orange-600 hover:to-amber-600 transition-all duration-200">
                    <FaPlus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-bold text-lg text-gray-900 ml-4">{(item.prix || 0) * (item.quantity || 1)}€</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-4">
              <span className="text-lg font-semibold text-gray-700">Total:</span>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                {cart.reduce((total, item) => total + ((item.prix || 0) * (item.quantity || 1)), 0).toFixed(2)}€
              </span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white text-center py-4 px-6 rounded-2xl font-bold text-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Commander maintenant
            </Link>
          </div>
        </div>
      )}

      {/* Notification d'ajout au panier */}
      {showCartNotification && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-600 text-white px-6 py-3 rounded-2xl shadow-2xl z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <FaShoppingCart className="h-5 w-5" />
            <span className="font-semibold">Article ajouté au panier !</span>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section des catégories style Uber Eats */}
        <section className="mb-6">
          <div className="flex items-center space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full transition-all duration-200 ${
                    selectedCategory === category.id
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${
                    selectedCategory === category.id 
                      ? 'text-white' 
                      : 'text-gray-600'
                  }`} />
                  <span className={`text-sm font-medium whitespace-nowrap ${
                    selectedCategory === category.id 
                      ? 'text-white' 
                      : 'text-gray-700'
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Encart publicitaire amélioré */}
        <section className="mb-12">
          <AdBanner
            title="Marché de Producteurs Locaux à Ganges !"
            image="/ads/marche-ganges.jpg"
            description="Découvrez les produits frais et locaux tous les samedis matins sur la place du marché à Ganges. Soutenez les commerçants du coin !"
            link="https://www.ganges.fr/marche"
            sponsor="Ville de Ganges"
            style={{ 
              boxShadow: '0 20px 40px 0 rgba(255,193,7,0.3)', 
              background: 'linear-gradient(135deg, #fffbe6 0%, #fffde4 100%)', 
              border: '3px solid #ffe082',
              borderRadius: '24px'
            }}
          />
        </section>

        {/* Section des restaurants avec défilement vertical élégant */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Restaurants populaires</h2>
              <p className="text-gray-600">Découvrez les meilleurs restaurants de votre région</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-2xl hover:border-orange-400 hover:shadow-lg transition-all duration-200"
            >
              <FaFilter className="h-5 w-5" />
              <span className="font-medium">Filtres</span>
            </button>
          </div>

          {/* Filtres et tri */}
          {showFilters && (
            <div className="bg-white rounded-3xl p-6 mb-8 shadow-xl border border-gray-100">
              <div className="flex flex-wrap gap-6 items-center">
                <div className="flex items-center space-x-4">
                  <span className="text-gray-700 font-medium">Trier par:</span>
                                      <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-200"
                    >
                    <option value="recommended">Recommandés</option>
                    <option value="rating">Mieux notés</option>
                    <option value="delivery_time">Plus rapides</option>
                    <option value="distance">Plus proches</option>
                  </select>
                </div>
                
                <div className="text-gray-600 text-sm bg-gray-100 px-4 py-2 rounded-full">
                  {filteredAndSortedRestaurants.length} restaurant{filteredAndSortedRestaurants.length !== 1 ? 's' : ''} trouvé{filteredAndSortedRestaurants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Liste verticale des restaurants avec espacement élégant */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          ) : filteredAndSortedRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl">🔍</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun restaurant trouvé</h3>
              <p className="text-gray-600 text-lg">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-8">
              {filteredAndSortedRestaurants.map((restaurant, index) => (
                <div
                  key={restaurant.id}
                  className="group cursor-pointer transform transition-all duration-300 hover:scale-[1.02]"
                  onClick={() => handleRestaurantClick(restaurant)}
                >
                  <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100">
                    <div className="flex flex-col lg:flex-row">
                      {/* Image du restaurant */}
                      <div className="relative h-64 lg:h-auto lg:w-1/3 overflow-hidden">
                        <Image
                          src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'}
                          alt={restaurant.nom}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                          unoptimized
                        />
                        
                        {/* Overlay avec gradient */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                        
                        {/* Badges */}
                        <div className="absolute top-4 left-4 flex flex-col space-y-2">
                          {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                              ⭐ Sponsorisé
                            </span>
                          )}
                          {favorites.includes(restaurant.id) && (
                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                              ❤️ Favori
                            </span>
                          )}
                        </div>
                        
                        {/* Bouton favori */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleFavorite(restaurant);
                          }}
                          className="absolute top-4 right-4 w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 group-hover:scale-110"
                        >
                          <FaHeart className={`w-5 h-5 ${favorites.includes(restaurant.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                        </button>
                        
                        {/* Temps de livraison */}
                        <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
                          <div className="flex items-center space-x-2">
                            <FaClock className="h-4 w-4 text-gray-600" />
                            <span className="text-sm font-semibold text-gray-800">{restaurant.deliveryTime || '25-35'} min</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Contenu de la carte */}
                      <div className="flex-1 p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-4">
                            <h3 className="text-2xl font-bold text-gray-900 group-hover:text-purple-600 transition-colors">
                              {restaurant.nom}
                            </h3>
                            <div className="flex items-center bg-yellow-100 px-3 py-1 rounded-full">
                              <FaStar className="h-4 w-4 text-yellow-500 mr-1" />
                              <span className="text-sm font-semibold text-gray-800">{restaurant.rating || '4.5'}</span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 text-lg leading-relaxed mb-6">
                            {restaurant.description}
                          </p>
                          
                          {/* Informations de livraison */}
                          <div className="flex items-center justify-between text-sm mb-6">
                            <div className="flex items-center text-gray-500">
                              <FaMotorcycle className="h-4 w-4 mr-2" />
                              <span>Livraison à partir de {restaurant.frais_livraison || restaurant.deliveryFee || 2.50}€</span>
                            </div>
                            <div className="text-gray-500">
                              Min. {restaurant.minOrder || 15}€
                            </div>
                          </div>
                        </div>
                        
                        {/* Bouton commander */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Empêcher le clic sur le bouton de commande lui-même
                            handleRestaurantClick(restaurant);
                          }}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white py-4 px-6 rounded-2xl font-semibold hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-lg"
                        >
                          Voir le menu
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
} 