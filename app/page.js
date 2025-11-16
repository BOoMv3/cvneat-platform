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

const TARGET_OPENING_HOUR = 18;
const READY_RESTAURANTS_LABEL = '';
const READY_RESTAURANTS = new Set();

const normalizeName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeToken = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const extractKeywords = (value) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => extractKeywords(item))
      .filter(Boolean);
  }

  if (typeof value === 'object') {
    return Object.values(value || {})
      .flatMap((val) => extractKeywords(val))
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];

    // Tenter de parser un JSON array
    if (
      (trimmed.startsWith('[') && trimmed.endsWith(']')) ||
      (trimmed.startsWith('{') && trimmed.endsWith('}'))
    ) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractKeywords(parsed);
      } catch (err) {
        // Ignorer si non JSON valide
      }
    }

    return trimmed
      .split(/[,;\/|&]| et |\n|\r|\t/gi)
      .map((token) => normalizeToken(token))
      .filter(Boolean);
  }

  return [normalizeToken(value)];
};

const getCategoryTokensForRestaurant = (restaurant = {}) => {
  const sources = [
    restaurant.cuisine_type,
    restaurant.type_cuisine,
    restaurant.categories,
    restaurant.category,
    restaurant.categorie,
    restaurant.type,
    restaurant.tags,
    restaurant.keywords,
    restaurant.specialites,
    restaurant.specialities,
    restaurant.description
  ];

  const tokens = sources
    .flatMap((source) => extractKeywords(source))
    .filter(Boolean);

  return Array.from(new Set(tokens.map(normalizeToken))).filter(Boolean);
};

const getNextOpeningDate = () => {
  const target = new Date();
  target.setDate(target.getDate() + 1);
  target.setHours(TARGET_OPENING_HOUR, 0, 0, 0);
  return target;
};

const formatTimeForLabel = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const [hours, minutes = '00'] = timeStr.split(':');
  if (hours === undefined) return timeStr;
  return `${hours.padStart(2, '0')}h${minutes.padStart(2, '0')}`;
};

const formatTimeRangeLabel = (start, end) => {
  const formattedStart = formatTimeForLabel(start);
  const formattedEnd = formatTimeForLabel(end);
  if (!formattedStart || !formattedEnd) return null;
  return `${formattedStart} - ${formattedEnd}`;
};

const getTodayHoursLabel = (restaurant = {}) => {
  try {
    let horaires = restaurant.horaires;
    if (!horaires) return null;

    if (typeof horaires === 'string') {
      try {
        horaires = JSON.parse(horaires);
      } catch {
        return null;
      }
    }

    const todayFormatter = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' });
    const todayName = todayFormatter.format(new Date()).toLowerCase();
    const variants = [todayName, todayName.charAt(0).toUpperCase() + todayName.slice(1), todayName.toUpperCase()];
    let heuresJour = null;
    for (const key of variants) {
      if (horaires?.[key]) {
        heuresJour = horaires[key];
        break;
      }
    }

    if (!heuresJour) return null;

    if (Array.isArray(heuresJour.plages) && heuresJour.plages.length > 0) {
      const ranges = heuresJour.plages
        .map(plage => formatTimeRangeLabel(plage?.ouverture, plage?.fermeture))
        .filter(Boolean);
      return ranges.length > 0 ? ranges.join(' / ') : null;
    }

    return formatTimeRangeLabel(heuresJour?.ouverture, heuresJour?.fermeture);
  } catch {
    return null;
  }
};

const formatStatusHoursLabel = (statusData, fallback) => {
  if (!statusData) return fallback || null;

  if (Array.isArray(statusData.plages) && statusData.plages.length > 0) {
    const ranges = statusData.plages
      .map(plage => formatTimeRangeLabel(plage?.ouverture, plage?.fermeture))
      .filter(Boolean);
    if (ranges.length > 0) {
      return ranges.join(' / ');
    }
  }

  const singleRange = formatTimeRangeLabel(statusData.openTime, statusData.closeTime);
  if (singleRange) return singleRange;

  return fallback || null;
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
    { id: 'all', name: 'Tous', icon: FaUtensils, color: 'from-orange-500 to-amber-600', tagline: 'Tout découvrir' },
    { id: 'traditional', name: 'Traditionnel', icon: FaUtensils, color: 'from-amber-600 to-red-500', tagline: 'Recettes authentiques' },
    { id: 'pizza', name: 'Pizza', icon: FaPizzaSlice, color: 'from-red-500 to-orange-500', tagline: 'Aux saveurs d\'Italie' },
    { id: 'burger', name: 'Burgers', icon: FaHamburger, color: 'from-amber-500 to-orange-500', tagline: 'Gourmand et fondant' },
    { id: 'coffee', name: 'Café', icon: FaCoffee, color: 'from-amber-600 to-yellow-600', tagline: 'Pause sucrée' },
    { id: 'dessert', name: 'Desserts', icon: FaIceCream, color: 'from-pink-400 to-orange-400', tagline: 'Douceurs sucrées' },
    { id: 'healthy', name: 'Healthy', icon: FaLeaf, color: 'from-green-500 to-emerald-500', tagline: 'Léger & vitaminé' },
    { id: 'fast', name: 'Fast Food', icon: FaFire, color: 'from-orange-500 to-red-500', tagline: 'Rapide & efficace' }
  ];

  const heroSlides = useMemo(() => [
    {
      id: 'slide-1',
      image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=2070&auto=format&fit=crop',
      title: 'Livraison rapide et repas délicieux',
      subtitle: 'Découvrez les meilleurs restaurants locaux sans bouger de votre canapé'
    },
    {
      id: 'slide-2',
      image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?q=80&w=2000&auto=format&fit=crop',
      title: 'Partenaires passionnés',
      subtitle: 'Des chefs soigneusement sélectionnés pour la qualité de leurs produits'
    },
    {
      id: 'slide-3',
      image: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=2000&q=80',
      title: 'Promos exclusives CVN’EAT',
      subtitle: 'Profitez de remises et de programmes fidélité dédiés'
    }
  ], []);

  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!heroSlides.length) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [heroSlides.length]);

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
        
        const normalizedRestaurants = data
          .filter((restaurant) => {
            const normalized = normalizeName(restaurant.nom);
            return normalized && normalized !== '.';
          })
          .map((restaurant) => {
          const primaryImage =
            restaurant.profile_image ||
            restaurant.image_url ||
            restaurant.logo_image ||
            restaurant.profileImage ||
            restaurant.imageUrl;

          const bannerImage =
            restaurant.banner_image ||
            restaurant.bannerImage ||
            restaurant.cover_image ||
            restaurant.banniere_image;

          const logoImage =
            restaurant.logo_image ||
            restaurant.logoImage ||
            restaurant.profile_image ||
            restaurant.profileImage;

          const categoryTokens = getCategoryTokensForRestaurant(restaurant);
          const todayHoursLabel = getTodayHoursLabel(restaurant);

          return {
            ...restaurant,
            image_url: primaryImage,
            banner_image: bannerImage,
            logo_image: logoImage,
            cuisine_type: restaurant.cuisine_type || restaurant.type_cuisine || restaurant.type || restaurant.category,
            category: restaurant.category || restaurant.categorie,
            category_tokens: categoryTokens,
            today_hours_label: todayHoursLabel
          };
        });

        setRestaurants(normalizedRestaurants);
        
        // Vérifier le statut d'ouverture pour chaque restaurant
        const openStatusMap = {};
        await Promise.all(normalizedRestaurants.map(async (restaurant) => {
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
              const hoursLabel = formatStatusHoursLabel(statusData, restaurant.today_hours_label) || restaurant.today_hours_label || 'Horaires non communiquées';
              openStatusMap[restaurant.id] = {
                isOpen,
                isManuallyClosed,
                hoursLabel
              };
            } else {
              // Si erreur, vérifier au moins ferme_manuellement
              openStatusMap[restaurant.id] = {
                isOpen: !restaurant.ferme_manuellement && !restaurant.is_closed,
                isManuallyClosed: restaurant.ferme_manuellement || restaurant.is_closed || false,
                hoursLabel: restaurant.today_hours_label || 'Horaires non communiquées'
              };
            }
          } catch (err) {
            console.error(`Erreur vérification statut restaurant ${restaurant.id}:`, err);
            // Si erreur, considérer comme fermé par défaut sauf si pas de ferme_manuellement
            openStatusMap[restaurant.id] = {
              isOpen: !restaurant.ferme_manuellement && !restaurant.is_closed,
              isManuallyClosed: restaurant.ferme_manuellement || restaurant.is_closed || false,
              hoursLabel: restaurant.today_hours_label || 'Horaires non communiquées'
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
      image_url: restaurant.image_url || restaurant.imageUrl
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
    if (restaurant.is_active === false || restaurant.active === false || restaurant.status === 'inactive') {
      return false;
    }
    if (restaurant.ferme_definitivement) {
      return false;
    }
    // Filtre par catégorie
    if (selectedCategory !== 'all') {
      const restaurantTokens = restaurant.category_tokens || [];

      const categoryMap = {
        'pizza': ['pizza', 'italien', 'italian', 'pizzeria'],
        'burger': ['burger', 'hamburger', 'fast food', 'fast-food', 'sandwich'],
        'coffee': ['café', 'coffee', 'cafe', 'boulangerie', 'bakery', 'boulanger'],
        'dessert': ['dessert', 'patisserie', 'pâtisserie', 'glace', 'ice cream', 'sucré'],
        'healthy': ['healthy', 'salade', 'salad', 'bio', 'organic', 'végétarien', 'vegan'],
        'fast': ['fast food', 'fast-food', 'restaurant rapide', 'quick', 'snack'],
        'traditional': [
          'traditionnel',
          'traditionnelle',
          'tradition',
          'cuisine familiale',
          'fait maison',
          'terroir',
          'brasserie',
          'bistrot',
          'bistro',
          'français',
          'francaise',
          'française'
        ]
      };
      
      const validCategories = categoryMap[selectedCategory] || [];
      const matchesCategory = validCategories.some((cat) =>
        restaurantTokens.some((token) => token.includes(normalizeToken(cat)))
      );
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

  const fallbackReadyRestaurants = useMemo(() => [], [restaurants]);

  const finalRestaurants = filteredAndSortedRestaurants.length > 0
    ? filteredAndSortedRestaurants
    : fallbackReadyRestaurants;

  const displayRestaurants = useMemo(() => {
    const seen = new Set();
    const uniqueRestaurants = finalRestaurants.filter((restaurant) => {
      const key = normalizeName(restaurant.nom) || restaurant.id;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    const boostOrder = (restaurant) => {
      const normalized = normalizeName(restaurant.nom);
      if (normalized.includes('otoasty')) return -1;
      if (normalized.includes('la bonne pate')) return 0;
      if (normalized.includes('eclipse')) return 1;
      return 2;
    };

    return uniqueRestaurants.sort((a, b) => {
      const statusA = restaurantsOpenStatus[a.id] || {};
      const statusB = restaurantsOpenStatus[b.id] || {};
      const isOpenA = statusA.isOpen === true && statusA.isManuallyClosed !== true;
      const isOpenB = statusB.isOpen === true && statusB.isManuallyClosed !== true;

      if (isOpenA !== isOpenB) {
        return isOpenA ? -1 : 1;
      }

      const boostDiff = boostOrder(a) - boostOrder(b);
      if (boostDiff !== 0) return boostDiff;
      return 0;
    });
  }, [finalRestaurants, restaurantsOpenStatus]);

  if (!isClient) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section avec carrousel visuel */}
      <section className="relative h-[420px] sm:h-[520px] md:h-[620px] overflow-hidden">
        {heroSlides.map((slide, index) => (
          <div
            key={slide.id}
            className={`absolute inset-0 transition-opacity duration-[1200ms] ease-out ${index === currentSlide ? 'opacity-100' : 'opacity-0'}`}
          >
            <Image
              src={slide.image}
              alt={slide.title}
              fill
              className="object-cover"
              priority={index === 0}
              unoptimized
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/30" />
          </div>
        ))}
        
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
              {heroSlides[currentSlide]?.title}
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl mb-4 sm:mb-5 md:mb-6 lg:mb-8 text-gray-200">
              {heroSlides[currentSlide]?.subtitle}
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

          </div>
        </div>

        {/* Indicateurs du carrousel */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center space-x-2 z-20">
          {heroSlides.map((slide, index) => (
            <button
              key={slide.id}
              aria-label={`Aller au slide ${index + 1}`}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full transition-all ${index === currentSlide ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </section>

      {/* Bandeau promo défilant simple */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 text-white py-2">
        <div className="max-w-7xl mx-auto px-4">
          <marquee behavior="scroll" direction="left" scrollamount="6">
            🎉 Aujourd’hui seulement: -20% sur votre commande dès 20€ d’achat. Frais de livraison exclus. 🎉
          </marquee>
        </div>
      </div>


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
        <section className="mb-10">
          <div className="flex items-stretch space-x-2 sm:space-x-3 lg:space-x-4 overflow-x-auto pb-4 scrollbar-hide px-1">
            {categories.map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`relative flex-shrink-0 w-28 sm:w-32 md:w-36 h-24 sm:h-28 rounded-3xl transition-all duration-300 focus:outline-none group ${
                    isSelected ? 'scale-105 shadow-2xl' : 'hover:scale-105 hover:shadow-xl'
                  }`}
                >
                  <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${category.color} ${isSelected ? 'opacity-100' : 'opacity-85 group-hover:opacity-100'} transition-opacity`} />
                  <div className={`absolute inset-0 rounded-3xl border-2 ${isSelected ? 'border-white/70' : 'border-white/30 group-hover:border-white/50'} transition-colors`} />
                  <div className="relative h-full w-full p-3 sm:p-4 flex flex-col justify-between text-left text-white">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-md">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <p className="text-sm sm:text-lg font-bold leading-tight">{category.name}</p>
                      <p className="text-[10px] sm:text-xs text-white/85 mt-0.5">
                        {category.tagline}
                      </p>
                    </div>
                  </div>
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
                const restaurantStatus = restaurantsOpenStatus[restaurant.id] || { 
                  isOpen: true, 
                  isManuallyClosed: false,
                  hoursLabel: restaurant.today_hours_label || 'Horaires non communiquées'
                };
                const normalizedName = normalizeName(restaurant.nom);
                const isReadyRestaurant = READY_RESTAURANTS.has(normalizedName);
                const isClosed = !restaurantStatus.isOpen || restaurantStatus.isManuallyClosed;
                const displayHoursLabel = restaurantStatus.isManuallyClosed
                  ? 'Fermé temporairement'
                  : (restaurantStatus.hoursLabel || restaurant.today_hours_label || 'Horaires non communiquées');
                
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
                        </div>
                        
                        {/* Overlay */}
                        <div className={`absolute inset-0 ${isClosed ? 'bg-gradient-to-t from-black/70 via-black/40 to-transparent' : 'bg-gradient-to-t from-black/60 via-transparent to-transparent'} z-0`}></div>
                        
                        {/* Badges - Optimisé mobile */}
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 md:top-4 md:left-4 flex flex-col space-y-1.5 sm:space-y-2 z-20">
                          {/* Badge Promo global */}
                          {!isClosed && (
                            <span className="bg-purple-600/90 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-3.5 md:py-1.5 rounded-full text-[10px] sm:text-xs font-bold shadow-lg border border-white/20">
                              -20% ce soir
                            </span>
                          )}
                          {isClosed && (
                            <span className="bg-red-600 text-white/95 px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-3.5 md:py-1.5 rounded-full text-xs sm:text-sm font-semibold shadow-lg border border-white/40">
                              Fermé
                            </span>
                          )}
                          {!isClosed && restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
                            <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                              ⭐ Sponsorisé
                            </span>
                          )}
                          {!isClosed && favorites.includes(restaurant.id) && (
                            <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-1 sm:px-3 sm:py-1.5 md:px-4 md:py-2 rounded-full text-xs sm:text-sm font-bold shadow-lg">
                              ❤️ Favori
                            </span>
                          )}
                        </div>
                        
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
                        <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 md:bottom-4 md:left-4 bg-white/90 backdrop-blur-sm px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg shadow-lg z-20">
                          <div className="flex flex-col">
                            <div className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2">
                              <FaClock className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4 text-gray-600 flex-shrink-0" />
                              <span className="text-[10px] sm:text-xs md:text-sm font-semibold text-gray-800">
                                {displayHoursLabel}
                              </span>
                            </div>
                            {!restaurantStatus.isManuallyClosed && (
                              <span className="text-[9px] sm:text-[10px] md:text-xs text-gray-500 mt-0.5">
                                Livraison ~{restaurant.deliveryTime || '25-35'} min
                              </span>
                            )}
                          </div>
                        </div>
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
                          className={`w-full py-4 sm:py-4 px-4 sm:px-6 rounded-2xl font-semibold transition-all duration-200 shadow-lg text-base sm:text-base lg:text-lg min-h-[48px] sm:min-h-[52px] touch-manipulation ${
                            isClosed
                              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                              : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:from-orange-600 hover:to-amber-700 hover:shadow-xl transform hover:scale-105 active:scale-95'
                          }`}
                        >
                          {isClosed ? 'Restaurant fermé pour le moment' : 'Voir le menu'}
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