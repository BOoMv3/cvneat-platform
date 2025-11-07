'use client';

import { useState, useEffect, useMemo } from 'react';
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
  FaIceCream,
  FaSignOutAlt,
  FaTruck,
  FaStore,
  FaImage
} from 'react-icons/fa';
import AdBanner from '@/components/AdBanner';
import Advertisement from '@/components/Advertisement';
import OptimizedRestaurantImage from '@/components/OptimizedRestaurantImage';

const TARGET_OPENING_HOUR = 19;
const READY_RESTAURANTS_LABEL = "La Bonne Pâte • L'Eclipse";
const READY_RESTAURANTS = new Set([
  'la bonne pate',
  "l'eclipse",
  'leclipse'
]);

const normalizeName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getNextOpeningDate = () => {
  const now = new Date();
  const target = new Date();
  target.setHours(TARGET_OPENING_HOUR, 0, 0, 0);

  if (now > target) {
    target.setDate(target.getDate() + 1);
  }

  return target;
};

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
  const [restaurantsOpenStatus, setRestaurantsOpenStatus] = useState({}); // Statut d'ouverture de chaque restaurant

  const nextOpeningDate = useMemo(() => getNextOpeningDate(), []);
  const nextOpeningLabel = useMemo(() => {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit'
    }).format(nextOpeningDate);
  }, [nextOpeningDate]);

  // Fonction de déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setUserPoints(0);
    router.push('/');
  };

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
            .select('role, points_fidelite')
            .eq('id', user.id)
            .single();
          
          if (userData) {
            setUserPoints(userData.points_fidelite || 0);
            // Stocker le rôle pour vérifier l'accès aux pages
            if (userData.role) {
              localStorage.setItem('userRole', userData.role);
            }
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
        
        // Vérifier le statut d'ouverture pour chaque restaurant
        const openStatusMap = {};
        await Promise.all(data.map(async (restaurant) => {
          try {
            const statusResponse = await fetch(`/api/restaurants/${restaurant.id}/hours`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            });
            if (statusResponse.ok) {
              const statusData = await statusResponse.json();
              // Utiliser une comparaison stricte === true pour éviter les cas undefined/null
              const isOpen = statusData.isOpen === true;
              const isManuallyClosed = statusData.is_manually_closed === true || statusData.reason === 'manual';
              openStatusMap[restaurant.id] = {
                isOpen,
                isManuallyClosed
              };
            } else {
              // Si erreur, vérifier au moins ferme_manuellement
              openStatusMap[restaurant.id] = {
                isOpen: !restaurant.ferme_manuellement && !restaurant.is_closed,
                isManuallyClosed: restaurant.ferme_manuellement || restaurant.is_closed || false
              };
            }
          } catch (err) {
            console.error(`Erreur vérification statut restaurant ${restaurant.id}:`, err);
            // Si erreur, considérer comme fermé par défaut sauf si pas de ferme_manuellement
            openStatusMap[restaurant.id] = {
              isOpen: !restaurant.ferme_manuellement && !restaurant.is_closed,
              isManuallyClosed: restaurant.ferme_manuellement || restaurant.is_closed || false
            };
          }
        }));
        setRestaurantsOpenStatus(openStatusMap);
      } catch (error) {
        console.error('Erreur lors du chargement des restaurants:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  const handleToggleFavorite = (restaurant) => {
    const currentFavorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let newFavorites;
    
    if (favorites.includes(restaurant.id)) {
      // Retirer des favoris
      newFavorites = currentFavorites.filter(id => id !== restaurant.id);
    } else {
      // Ajouter aux favoris
      newFavorites = [...currentFavorites, restaurant.id];
    }
    
    // Mettre à jour localStorage et l'état local
    localStorage.setItem('favorites', JSON.stringify(newFavorites));
    setFavorites(newFavorites);
    
    console.log('Favoris mis à jour:', newFavorites);
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
    const normalizedName = normalizeName(restaurant.nom);
    const isReadyRestaurant = READY_RESTAURANTS.has(normalizedName);

    if (!isReadyRestaurant && (restaurant.is_active === false || restaurant.active === false || restaurant.status === 'inactive')) {
      return false;
    }
    if (restaurant.ferme_definitivement) {
      return false;
    }
    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      // Vérifier plusieurs champs possibles pour la catégorie
      const restaurantCategory = (
        restaurant.cuisine_type?.toLowerCase() || 
        restaurant.category?.toLowerCase() || 
        restaurant.type?.toLowerCase() ||
        restaurant.description?.toLowerCase() ||
        ''
      );
      
      const categoryMap = {
        'pizza': ['pizza', 'italien', 'italian', 'pizzeria'],
        'burger': ['burger', 'hamburger', 'fast food', 'fast-food', 'sandwich'],
        'coffee': ['café', 'coffee', 'cafe', 'boulangerie', 'bakery', 'boulanger'],
        'dessert': ['dessert', 'patisserie', 'pâtisserie', 'glace', 'ice cream', 'sucré'],
        'healthy': ['healthy', 'salade', 'salad', 'bio', 'organic', 'végétarien', 'vegan'],
        'fast': ['fast food', 'fast-food', 'restaurant rapide', 'quick', 'snack']
      };
      
      const validCategories = categoryMap[selectedCategory] || [];
      const matchesCategory = validCategories.some(cat => restaurantCategory.includes(cat));
      if (!matchesCategory) return false;
    }
    
    // Filtre par recherche textuelle
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        restaurant.nom?.toLowerCase().includes(searchLower) ||
        restaurant.description?.toLowerCase().includes(searchLower) ||
        restaurant.cuisine_type?.toLowerCase().includes(searchLower) ||
        restaurant.category?.toLowerCase().includes(searchLower) ||
        restaurant.adresse?.toLowerCase().includes(searchLower) ||
        restaurant.ville?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    return true;
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

  const fallbackReadyRestaurants = useMemo(() => {
    const uniqueMap = new Map();

    restaurants.forEach((restaurant) => {
      const normalizedName = normalizeName(restaurant.nom);
      if (!READY_RESTAURANTS.has(normalizedName)) {
        return;
      }

      if (restaurant.status === 'inactive' || restaurant.is_active === false || restaurant.active === false) {
        return;
      }

      if (!uniqueMap.has(normalizedName)) {
        uniqueMap.set(normalizedName, restaurant);
      }
    });

    return Array.from(uniqueMap.values());
  }, [restaurants]);

  const finalRestaurants = filteredAndSortedRestaurants.length > 0
    ? filteredAndSortedRestaurants
    : fallbackReadyRestaurants;

  const displayRestaurants = useMemo(() => {
    const seen = new Set();
    return finalRestaurants.filter((restaurant) => {
      const key = normalizeName(restaurant.nom) || restaurant.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }, [finalRestaurants]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section avec bannière et image de base - Optimisé mobile Android */}
      <section className="relative h-[400px] sm:h-[500px] md:h-[600px] overflow-hidden">
        <Image
          src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop"
          alt="Bannière de restauration"
          fill
          className="object-cover"
          priority
          unoptimized
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black bg-opacity-60"></div>
        
        {/* Logo CVN'EAT en haut à gauche - Optimisé mobile */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 z-20">
          <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3">
            <div className="relative">
              <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
                <div className="w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8 bg-white rounded-lg flex items-center justify-center">
                  <FaUtensils className="h-2.5 w-2.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-orange-600" />
                </div>
              </div>
              <div className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 md:-top-1 md:-right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-5 md:h-5 bg-green-500 rounded-full border-2 border-white shadow-md animate-pulse"></div>
              <div className="absolute -bottom-0.5 -left-0.5 sm:-bottom-1 sm:-left-1 md:-bottom-1 md:-left-1 w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-yellow-400 rounded-full border-1.5 sm:border-2 border-white"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl md:text-2xl font-black bg-gradient-to-r from-orange-600 via-red-600 to-orange-700 bg-clip-text text-transparent tracking-tight leading-tight">
                CVN'EAT
              </span>
              <span className="text-[10px] sm:text-xs text-gray-300 -mt-0.5 sm:-mt-1 font-medium hidden sm:block">Excellence culinaire</span>
            </div>
          </div>
        </div>
        
          {/* Actions utilisateur en haut à droite - Design compact avec icônes - Optimisé mobile */}
        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 z-20 flex items-center flex-wrap gap-1 sm:gap-1.5 md:gap-2 max-w-[calc(100vw-5rem)] sm:max-w-none">
          {/* Bouton Devenir Partenaire */}
          <Link href="/restaurant-request" className="bg-blue-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-blue-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaStore className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Partenaire</span>
          </Link>
          {/* Bouton Devenir Livreur */}
          <Link href="/become-delivery" className="bg-green-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-green-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaMotorcycle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Livreur</span>
          </Link>
          {/* Bouton Publicité */}
          <Link href="/advertise" className="bg-purple-600/90 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-purple-700 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaImage className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Pub</span>
          </Link>
          {/* Bouton Suivre ma commande - Compact avec icône */}
          <Link href="/track-order" className="bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 md:px-3 py-1.5 sm:py-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 flex items-center space-x-1 sm:space-x-1.5 text-[10px] sm:text-xs md:text-sm font-medium shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] touch-manipulation">
            <FaTruck className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
            <span className="hidden sm:inline">Ma commande</span>
          </Link>
          
          {user ? (
            <>
              {/* Points de fidélité - Compact avec icône */}
              <div className="flex items-center space-x-1 bg-white/20 backdrop-blur-sm px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-full shadow-md min-h-[36px] sm:min-h-[38px] md:min-h-[40px]">
                <FaGift className="text-yellow-400 h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                <span className="text-white text-[10px] sm:text-xs md:text-sm font-semibold">{userPoints}</span>
              </div>
              
              {/* Profil - Icône seule */}
              <Link href="/profile" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] flex items-center justify-center touch-manipulation">
                <FaUser className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 text-white" />
              </Link>
              
              {/* Déconnexion - Icône seule */}
              <button
                onClick={handleLogout}
                className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-red-500/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] flex items-center justify-center touch-manipulation"
                title="Déconnexion"
              >
                <FaSignOutAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </button>
            </>
          ) : (
            <>
              {/* Connexion - Icône seule */}
              <Link href="/login" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] flex items-center justify-center touch-manipulation" title="Connexion">
                <FaSignInAlt className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </Link>
              
              {/* Inscription - Icône seule */}
              <Link href="/register" className="bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full text-white hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] flex items-center justify-center touch-manipulation" title="Inscription">
                <FaUserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4" />
              </Link>
            </>
          )}
          
          {/* Panier flottant - Icône avec badge */}
          {cart.length > 0 && (
            <button
              onClick={() => setShowFloatingCart(!showFloatingCart)}
              className="relative bg-white/20 backdrop-blur-sm p-1.5 sm:p-2 rounded-full hover:bg-white/30 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 min-h-[36px] sm:min-h-[38px] md:min-h-[40px] min-w-[36px] sm:min-w-[38px] md:min-w-[40px] flex items-center justify-center touch-manipulation"
            >
              <FaShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-4 md:w-4 text-white" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] sm:text-xs rounded-full h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5 flex items-center justify-center font-bold shadow-sm">
                {cart.length}
              </span>
            </button>
          )}
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl w-full">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-7xl font-bold mb-3 sm:mb-4 md:mb-6 leading-tight">
              Découvrez les meilleurs restaurants
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-4 sm:mb-5 md:mb-6 lg:mb-8 text-gray-200">
              Livraison rapide et repas délicieux à votre porte
            </p>

            {/* Barre de recherche intégrée - Optimisée mobile */}
            <div className="bg-white rounded-xl p-3 sm:p-4 shadow-lg max-w-full sm:max-w-lg">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <FaSearch className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Nom du restaurant, cuisine, plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 border-none outline-none text-gray-900 placeholder-gray-500 text-sm sm:text-base min-h-[44px] touch-manipulation"
                />
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <div className="bg-white/20 backdrop-blur-md rounded-3xl p-4 sm:p-5 text-white shadow-xl border border-white/25">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-white/80 flex items-center justify-center shadow-lg">
                      <FaClock className="text-purple-600 h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm uppercase tracking-widest text-purple-100/90 font-semibold">
                      Horaires du jour
                    </p>
                    <p className="text-lg sm:text-xl font-bold">
                      Prochaine ouverture : {nextOpeningLabel}
                    </p>
                    <p className="text-xs sm:text-sm text-purple-100/85 mt-1">
                      Restaurants prêts aujourd'hui : {READY_RESTAURANTS_LABEL}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Panier flottant - Optimisé mobile */}
      {showFloatingCart && cart.length > 0 && (
        <div className="fixed top-16 sm:top-24 right-2 sm:right-6 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 z-50 w-[calc(100vw-1rem)] sm:w-80 sm:min-w-96 max-w-[calc(100vw-1rem)] sm:max-w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Votre panier</h3>
            <button
              onClick={() => setShowFloatingCart(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors p-2 -m-2 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <FaTimes className="h-5 w-5 sm:h-5 sm:w-5" />
            </button>
          </div>
          
          <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
                <span className="flex-1 font-medium text-gray-800 dark:text-gray-200 text-sm sm:text-base pr-2">{item.nom}</span>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button className="w-10 h-10 sm:w-8 sm:h-8 bg-white dark:bg-gray-600 border-2 border-gray-200 dark:border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors touch-manipulation active:scale-95">
                    <FaMinus className="h-3 w-3 sm:h-3 sm:w-3 text-gray-600 dark:text-gray-200" />
                  </button>
                  <span className="w-8 sm:w-10 text-center font-semibold text-gray-900 dark:text-gray-200 text-sm sm:text-base">{item.quantity || 1}</span>
                  <button className="w-10 h-10 sm:w-8 sm:h-8 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center hover:from-orange-600 hover:to-amber-600 transition-all duration-200 touch-manipulation active:scale-95">
                    <FaPlus className="h-3 w-3 sm:h-3 sm:w-3" />
                  </button>
                </div>
                <span className="font-bold text-base sm:text-lg text-gray-900 dark:text-gray-200 ml-2 sm:ml-4">{(item.prix || 0) * (item.quantity || 1)}€</span>
              </div>
            ))}
          </div>
          
          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between mb-4">
              <span className="text-base sm:text-lg font-semibold text-gray-700">Total:</span>
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-600 bg-clip-text text-transparent">
                {cart.reduce((total, item) => total + ((item.prix || 0) * (item.quantity || 1)), 0).toFixed(2)}€
              </span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white text-center py-4 sm:py-4 px-6 rounded-2xl font-bold text-base sm:text-lg hover:from-orange-600 hover:to-amber-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 touch-manipulation active:scale-95 min-h-[52px] sm:min-h-[56px]"
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
        {/* Section des catégories style Uber Eats - Optimisé mobile */}
        <section className="mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 overflow-x-auto pb-3 scrollbar-hide px-1">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex-shrink-0 flex items-center space-x-1.5 sm:space-x-2 px-4 sm:px-5 py-3 sm:py-3.5 rounded-2xl transition-all duration-300 min-h-[48px] sm:min-h-[52px] touch-manipulation ${
                    selectedCategory === category.id
                      ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md active:scale-95'
                  }`}
                >
                  <Icon className={`h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0 ${
                    selectedCategory === category.id 
                      ? 'text-white' 
                      : 'text-gray-600'
                  }`} />
                  <span className={`text-sm sm:text-base font-semibold whitespace-nowrap ${
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

        {/* Espace publicitaire géré par l'admin */}
        <section className="mb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Advertisement position="banner_middle" />
        </section>

        {/* Section des restaurants avec défilement vertical élégant */}
        <section className="mb-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Restaurants populaires</h2>
              <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base">Découvrez les meilleurs restaurants de votre région</p>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 sm:gap-3 px-5 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl hover:border-orange-400 dark:hover:border-orange-500 hover:shadow-lg transition-all duration-200 text-sm sm:text-base font-semibold min-h-[48px] sm:min-h-[52px] touch-manipulation active:scale-95"
            >
              <FaFilter className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="font-semibold">Filtres</span>
            </button>
          </div>

          {/* Filtres et tri - Optimisé mobile */}
          {showFilters && (
            <div className="bg-white rounded-3xl p-4 sm:p-6 mb-8 shadow-xl border border-gray-100">
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 items-start sm:items-center">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  <span className="text-gray-700 font-semibold text-sm sm:text-base">Trier par:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-3 sm:py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-200 focus:border-orange-400 transition-all duration-200 text-sm sm:text-base min-h-[48px] sm:min-h-[44px] w-full sm:w-auto"
                  >
                    <option value="recommended">Recommandés</option>
                    <option value="rating">Mieux notés</option>
                    <option value="delivery_time">Plus rapides</option>
                    <option value="distance">Plus proches</option>
                  </select>
                </div>
                
                <div className="text-gray-600 text-sm sm:text-base bg-gray-100 px-4 py-3 sm:py-2 rounded-full font-medium min-h-[48px] sm:min-h-[44px] flex items-center justify-center">
                  {displayRestaurants.length} restaurant{displayRestaurants.length !== 1 ? 's' : ''} trouvé{displayRestaurants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Liste verticale des restaurants avec espacement élégant */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
            </div>
          ) : displayRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-32 h-32 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-6xl">🔍</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Aucun restaurant trouvé</h3>
              <p className="text-gray-600 text-lg">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="space-y-8">
              {displayRestaurants.map((restaurant, index) => {
                const restaurantStatus = restaurantsOpenStatus[restaurant.id] || { isOpen: true, isManuallyClosed: false };
                const normalizedName = normalizeName(restaurant.nom);
                const isReadyRestaurant = READY_RESTAURANTS.has(normalizedName);
                const isClosed = isReadyRestaurant ? false : (!restaurantStatus.isOpen || restaurantStatus.isManuallyClosed);
                
                return (
                <div
                  key={restaurant.id}
                  className={`group transform transition-all duration-300 ${isClosed ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}`}
                  onClick={() => !isClosed && handleRestaurantClick(restaurant)}
                >
                  <div className={`bg-white rounded-3xl shadow-lg transition-all duration-300 overflow-hidden border ${isClosed ? 'border-gray-300' : 'border-gray-100 hover:shadow-2xl'}`}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-0">
                      {/* Image du restaurant - Optimisé mobile */}
                      <div className="relative sm:col-span-1 overflow-hidden h-48 sm:h-56 md:h-64 lg:h-72">
                        <div className="relative h-full w-full">
                          <OptimizedRestaurantImage
                            restaurant={restaurant}
                            className={`h-full w-full object-cover transition-all duration-300 ${isClosed ? 'grayscale opacity-40' : ''}`}
                            priority={false}
                            sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          />
                          
                          {/* Filtre gris transparent si fermé */}
                          {isClosed && (
                            <div className="absolute inset-0 bg-gray-900/60 z-10 flex items-center justify-center">
                              <div className="bg-red-600/95 text-white px-4 py-2 sm:px-6 sm:py-3 rounded-full text-sm sm:text-base md:text-lg font-bold shadow-2xl backdrop-blur-sm border-2 border-white/30">
                                🔴 Fermé
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Overlay avec gradient (seulement si ouvert) */}
                        {!isClosed && (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent z-0"></div>
                        )}
                        
                        {/* Badges - Optimisé mobile */}
                        {!isClosed && (
                          <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 flex flex-col space-y-1.5 sm:space-y-2 z-20">
                            {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
                              <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                                ⭐ Sponsorisé
                              </span>
                            )}
                            {favorites.includes(restaurant.id) && (
                              <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                                ❤️ Favori
                              </span>
                            )}
                          </div>
                        )}
                        
                        {/* Bouton favori - Optimisé mobile Android */}
                        {!isClosed && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(restaurant);
                            }}
                            className="absolute top-2 right-2 sm:top-3 sm:right-3 md:top-4 md:right-4 w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-all duration-200 group-hover:scale-110 touch-manipulation active:scale-95 z-20"
                          >
                            <FaHeart className={`w-4 h-4 sm:w-5 sm:h-5 ${favorites.includes(restaurant.id) ? 'text-red-500 fill-current' : 'text-gray-600'}`} />
                          </button>
                        )}
                        
                        {/* Temps de livraison - Optimisé mobile */}
                        {!isClosed && (
                          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 bg-white/90 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg z-20">
                            <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
                              <FaClock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-gray-600 flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800">{restaurant.deliveryTime || '25-35'} min</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* Contenu de la carte - Optimisé mobile */}
                      <div className="sm:col-span-2 p-3 sm:p-4 md:p-6 lg:p-8 flex flex-col justify-between">
                        <div>
                          <div className="flex items-start justify-between mb-2 sm:mb-3 md:mb-4 gap-2">
                            <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-purple-600 transition-colors flex-1 min-w-0 break-words">
                              {restaurant.nom}
                            </h3>
                            <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 px-2 sm:px-2.5 md:px-3 py-1 rounded-full flex-shrink-0">
                              <FaStar className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-yellow-500 dark:text-yellow-400 mr-0.5 sm:mr-1 flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800 dark:text-gray-200">{restaurant.rating || '4.5'}</span>
                            </div>
                          </div>
                          
                          <p className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed mb-3 sm:mb-4 md:mb-6 line-clamp-2 sm:line-clamp-3">
                            {restaurant.description}
                          </p>
                          
                          {/* Informations de livraison - Optimisé mobile */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-xs md:text-sm mb-3 sm:mb-4 md:mb-6 space-y-1 sm:space-y-0 sm:gap-2">
                            <div className="flex items-center text-gray-500 dark:text-gray-400">
                              <FaMotorcycle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 mr-1 sm:mr-1.5 md:mr-2 flex-shrink-0" />
                              <span className="whitespace-nowrap">Livraison à partir de {restaurant.frais_livraison || restaurant.deliveryFee || 2.50}€</span>
                            </div>
                            <div className="text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              Min. {restaurant.minOrder || 15}€
                            </div>
                          </div>
                        </div>
                        
                        {/* Bouton commander - Optimisé mobile */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); // Empêcher le clic sur le bouton de commande lui-même
                            if (!isClosed) {
                              handleRestaurantClick(restaurant);
                            }
                          }}
                          disabled={isClosed}
                          className={`w-full py-4 sm:py-4 px-4 sm:px-6 rounded-2xl font-semibold transition-all duration-200 shadow-lg text-base sm:text-base lg:text-lg min-h-[52px] sm:min-h-[56px] touch-manipulation ${
                            isClosed
                              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 hover:shadow-xl transform hover:scale-105 active:scale-95'
                          }`}
                        >
                          {isClosed ? 'Restaurant fermé' : 'Voir le menu'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </section>

        {/* Publicité footer */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <Advertisement position="footer" />
        </div>
      </main>
    </div>
  );
} 