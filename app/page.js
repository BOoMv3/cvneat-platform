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
  FaMapMarkerAlt,
  FaHeart,
  FaShoppingCart,
  FaTimes,
  FaPlus,
  FaMinus,
  FaUser,
  FaSignInAlt,
  FaUserPlus,
  FaGift,
  FaArrowRight,
  FaCheck
} from 'react-icons/fa';
import AdBanner from '@/components/AdBanner';
import RestaurantCard from '@/components/RestaurantCard';

// Desactiver le rendu statique pour cette page
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export default function Home() {
  const router = useRouter();
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [cart, setCart] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuLoading, setMenuLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('recommended');
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [user, setUser] = useState(null);
  const [userPoints, setUserPoints] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [addingToCart, setAddingToCart] = useState({});
  const [showCartNotification, setShowCartNotification] = useState(false);
  const [lastAddedItem, setLastAddedItem] = useState(null);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Verifier l'authentification
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        // Recuperer les points de fidelite
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

        // Recuperer les restaurants favoris (temporairement désactivé)
        // TODO: Réactiver après application de la migration SQL
        /*
        try {
          const { data: favoritesData } = await supabase
            .from('user_favorites')
            .select('restaurant_id')
            .eq('user_id', user.id);
          
          if (favoritesData) {
            setFavorites(favoritesData.map(fav => fav.restaurant_id));
          }
        } catch (error) {
          console.error('Erreur recuperation favoris:', error);
        }
        */
      }
    };

    checkAuth();

    const fetchRestaurants = async () => {
      try {
        console.log('Debut du chargement des restaurants...');
        const response = await fetch('/api/restaurants');
        console.log('Statut de la reponse:', response.status);
        
        const data = await response.json();
        console.log('Donnees recues:', data);
        
        if (!response.ok) {
          console.error('Erreur detaillee:', data);
          throw new Error(data.message || 'Erreur lors du chargement des restaurants');
        }
        
        if (!Array.isArray(data)) {
          console.error('Les donnees recues ne sont pas un tableau:', data);
          throw new Error('Format de donnees invalide');
        }
        
        setRestaurants(data);
        console.log('Restaurants charges avec succes:', data.length);
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

  const addToCart = async (item) => {
    // Verifier si l'utilisateur est connecte
    if (!user) {
      alert('Vous devez etre connecte pour ajouter des articles au panier.');
      router.push('/login');
      return;
    }

    // Animation d'ajout
    setAddingToCart(prev => ({ ...prev, [item.id]: true }));
    setLastAddedItem(item);

    let deliveryFee = cart.length > 0 ? getDeliveryFee() : (selectedRestaurant?.deliveryFee || selectedRestaurant?.frais_livraison || 2.50);

    // Calculer les frais de livraison si le panier est vide
    if (cart.length === 0 && selectedRestaurant && user) {
      try {
        const { data: userAddress } = await supabase
          .from('user_addresses')
          .select('address, city, postal_code')
          .eq('user_id', user.id)
          .is('is_default', true)
          .single();
        
        const fullDeliveryAddress = userAddress ? `${userAddress.address}, ${userAddress.postal_code} ${userAddress.city}` : null;

        if (fullDeliveryAddress) {
          const response = await fetch('/api/delivery/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              restaurantAddress: selectedRestaurant.address,
              deliveryAddress: fullDeliveryAddress
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data.livrable) {
              deliveryFee = data.frais_livraison;
            } else {
              alert(`Livraison impossible : ${data.message}`);
              setAddingToCart(prev => ({ ...prev, [item.id]: false }));
              return;
            }
          }
        }
      } catch (error) {
        console.error('Erreur calcul frais livraison, utilisation des frais par defaut:', error);
      }
    }

    setCart(prevCart => {
      const existingItem = prevCart.find(i => i.id === item.id);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(i =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      } else {
        newCart = [...prevCart, { ...item, quantity: 1 }];
      }
      
      const cartData = {
        items: newCart,
        restaurant: {
          id: selectedRestaurant.id,
          nom: selectedRestaurant.nom,
          adresse: selectedRestaurant.adresse || selectedRestaurant.address || '',
          city: selectedRestaurant.city || '',
        },
        frais_livraison: deliveryFee
      };
      safeLocalStorage.setJSON('cart', cartData);
      
      return newCart;
    });

    // Notification visuelle
    setShowCartNotification(true);
    setTimeout(() => setShowCartNotification(false), 2000);
    
    // Arrêter l'animation après un délai
    setTimeout(() => {
      setAddingToCart(prev => ({ ...prev, [item.id]: false }));
    }, 500);
  };

  const getDeliveryFee = () => {
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart && savedCart.frais_livraison !== undefined) {
      return savedCart.frais_livraison;
    }
    return 2.50; // Prix par défaut
  };

  const removeFromCart = (itemId) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(item => item.id !== itemId);
      
      // Récupérer les frais de livraison existants
      let fraisLivraison = 2.50;
      const savedCart = safeLocalStorage.getJSON('cart');
      if (savedCart) {
        try {
          fraisLivraison = savedCart.frais_livraison || 2.50;
        } catch (e) {
          console.error('Erreur lecture panier:', e);
        }
      }
      
      const cartData = {
        items: newCart,
        restaurant: selectedRestaurant,
        frais_livraison: fraisLivraison
      };
      safeLocalStorage.setJSON('cart', cartData);
      return newCart;
    });
  };

  const updateQuantity = (itemId, quantity) => {
    if (quantity < 1) {
      removeFromCart(itemId);
      return;
    }
    setCart(prevCart => {
      const newCart = prevCart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      );
      
      // Récupérer les frais de livraison existants
      let fraisLivraison = 2.50;
      const savedCart = safeLocalStorage.getJSON('cart');
      if (savedCart) {
        try {
          fraisLivraison = savedCart.frais_livraison || 2.50;
        } catch (e) {
          console.error('Erreur lecture panier:', e);
        }
      }
      
      const cartData = {
        items: newCart,
        restaurant: selectedRestaurant,
        frais_livraison: fraisLivraison
      };
      safeLocalStorage.setJSON('cart', cartData);
      return newCart;
    });
  };

  const getSubtotal = () => {
    return cart.reduce((total, item) => total + ((item.prix || item.price || 0) * (item.quantity || 0)), 0);
  };

  const getTotal = () => {
    return getSubtotal() + getDeliveryFee();
  };

  const handleRestaurantClick = (restaurant) => {
    router.push(`/restaurants/${restaurant.id}`);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
    setMenu([]);
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
      {/* Header avec barre de recherche */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo CVN'Eat */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-orange-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold text-xl">C</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">CVN'Eat</h1>
            </div>

            {/* Barre de recherche */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FaSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Rechercher un restaurant, un plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-full leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>
            </div>

            {/* Actions utilisateur */}
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2">
                    <FaGift className="text-orange-500" />
                    <span className="text-sm font-medium text-gray-700">{userPoints} pts</span>
                  </div>
                  <Link href="/profile" className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors">
                    <FaUser className="h-5 w-5" />
                    <span className="hidden sm:block">Profil</span>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login" className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors">
                    <FaSignInAlt className="h-5 w-5" />
                    <span className="hidden sm:block">Connexion</span>
                  </Link>
                  <Link href="/register" className="flex items-center space-x-2 text-gray-700 hover:text-purple-600 transition-colors">
                    <FaUserPlus className="h-5 w-5" />
                    <span className="hidden sm:block">Inscription</span>
                  </Link>
                </>
              )}
              
              {/* Panier flottant */}
              {cart.length > 0 && (
                <button
                  onClick={() => setShowFloatingCart(!showFloatingCart)}
                  className="relative p-2 text-gray-700 hover:text-purple-600 transition-colors"
                >
                  <FaShoppingCart className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cart.length}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Panier flottant */}
      {showFloatingCart && cart.length > 0 && (
        <div className="fixed top-20 right-4 bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 min-w-80">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Votre panier</h3>
            <button
              onClick={() => setShowFloatingCart(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
          
          <div className="space-y-2 mb-4 max-h-60 overflow-y-auto">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="flex-1">{item.nom}</span>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => updateQuantity(item.id, (item.quantity || 1) - 1)}
                    className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  >
                    <FaMinus className="h-3 w-3" />
                  </button>
                  <span className="w-8 text-center">{item.quantity || 1}</span>
                  <button
                    onClick={() => updateQuantity(item.id, (item.quantity || 1) + 1)}
                    className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200"
                  >
                    <FaPlus className="h-3 w-3" />
                  </button>
                </div>
                <span className="font-medium">{(item.prix || 0) * (item.quantity || 1)}€</span>
              </div>
            ))}
          </div>
          
          <div className="border-t pt-3">
            <div className="flex justify-between mb-3">
              <span className="font-medium">Total:</span>
              <span className="font-bold text-lg">{getTotal().toFixed(2)}€</span>
            </div>
            <Link
              href="/checkout"
              className="block w-full bg-purple-600 text-white text-center py-2 px-4 rounded-lg hover:bg-purple-700 transition-colors"
            >
              Commander
            </Link>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section "À découvrir sur CVN'Eat" */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">À découvrir sur CVN'Eat</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Sponsorisé</span>
          </div>
          
          <div className="relative">
            <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
              {filteredAndSortedRestaurants.slice(0, 3).map((restaurant) => (
                <div key={restaurant.id} className="flex-shrink-0 w-80">
                  <RestaurantCard
                    restaurant={{
                      ...restaurant,
                      image: restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
                      logo: restaurant.logo,
                      rating: restaurant.rating || '4.5',
                      review_count: restaurant.reviewCount || '100+',
                      delivery_time: restaurant.deliveryTime || '25',
                      delivery_fee: restaurant.frais_livraison || '2.50',
                      minimum_order: restaurant.minOrder,
                      promotion: restaurant.promotion,
                      is_sponsored: true
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(restaurant.id)}
                  />
                </div>
              ))}
            </div>
            
            {/* Flèche de navigation */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
              <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors">
                <FaArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Section "Lieux susceptibles de vous intéresser" */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Lieux susceptibles de vous intéresser</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">Sponsorisé</span>
          </div>
          
          <div className="relative">
            <div className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide">
              {filteredAndSortedRestaurants.slice(3, 6).map((restaurant) => (
                <div key={restaurant.id} className="flex-shrink-0 w-80">
                  <RestaurantCard
                    restaurant={{
                      ...restaurant,
                      image: restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
                      logo: restaurant.logo,
                      rating: restaurant.rating || '4.5',
                      review_count: restaurant.reviewCount || '100+',
                      delivery_time: restaurant.deliveryTime || '25',
                      delivery_fee: restaurant.frais_livraison || '2.50',
                      minimum_order: restaurant.minOrder,
                      promotion: restaurant.promotion,
                      is_sponsored: true
                    }}
                    onToggleFavorite={handleToggleFavorite}
                    isFavorite={favorites.includes(restaurant.id)}
                  />
                </div>
              ))}
            </div>
            
            {/* Flèche de navigation */}
            <div className="absolute right-0 top-1/2 transform -translate-y-1/2">
              <button className="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center text-gray-600 hover:text-gray-800 transition-colors">
                <FaArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* Section "Tous nos restaurants" */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Tous nos restaurants</h2>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <FaFilter />
              Filtres
            </button>
          </div>

          {/* Filtres et tri */}
          {showFilters && (
            <div className="bg-white rounded-lg p-4 mb-6 shadow-sm">
              <div className="flex flex-wrap gap-4">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="recommended">Recommandés</option>
                  <option value="rating">Mieux notés</option>
                  <option value="delivery_time">Plus rapides</option>
                  <option value="distance">Plus proches</option>
                </select>
                
                <div className="text-gray-600 text-sm">
                  {filteredAndSortedRestaurants.length} restaurant{filteredAndSortedRestaurants.length !== 1 ? 's' : ''} trouvé{filteredAndSortedRestaurants.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Grille des restaurants */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : filteredAndSortedRestaurants.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FaSearch className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucun restaurant trouvé</h3>
              <p className="text-gray-600">Essayez de modifier vos critères de recherche</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Encart publicitaire en haut de la liste */}
              <div className="col-span-1 md:col-span-2 lg:col-span-3">
                <AdBanner
                  title="Marché de Producteurs Locaux à Ganges !"
                  image="/ads/marche-ganges.jpg"
                  description="Découvrez les produits frais et locaux tous les samedis matin sur la place du marché à Ganges. Soutenez les commerçants du coin !"
                  link="https://www.ganges.fr/marche"
                  sponsor="Ville de Ganges"
                  style={{ boxShadow: '0 8px 32px 0 rgba(255,193,7,0.25)', background: 'linear-gradient(90deg, #fffbe6 0%, #fffde4 100%)', border: '2px solid #ffe082' }}
                />
              </div>
              
              {filteredAndSortedRestaurants.map((restaurant) => (
                <RestaurantCard
                  key={restaurant.id}
                  restaurant={{
                    ...restaurant,
                    image: restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop',
                    logo: restaurant.logo,
                    rating: restaurant.rating || '4.5',
                    review_count: restaurant.reviewCount || '100+',
                    delivery_time: restaurant.deliveryTime || '25',
                    delivery_fee: restaurant.frais_livraison || '2.50',
                    minimum_order: restaurant.minOrder,
                    promotion: restaurant.promotion,
                    is_sponsored: restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date()
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  isFavorite={favorites.includes(restaurant.id)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Notification d'ajout au panier */}
      {showCartNotification && lastAddedItem && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce">
          <div className="flex items-center space-x-2">
            <FaCheck className="h-5 w-5" />
            <span>{lastAddedItem.nom} ajouté au panier !</span>
          </div>
        </div>
      )}
    </div>
  );
} 