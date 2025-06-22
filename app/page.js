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
  FaGift
} from 'react-icons/fa';

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
          setRestaurants([]);
          setError('Format de donnees invalide');
          return;
        }
        
        setRestaurants(data);
      } catch (error) {
        console.error('Erreur complete:', error);
        setError(error.message);
        setRestaurants([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
    
  }, []);

  // Gestion des favoris côté client uniquement
  useEffect(() => {
    const savedFavorites = safeLocalStorage.getJSON('favorites');
    if (savedFavorites) {
      setFavorites(savedFavorites);
    }
  }, []);

  // Charger le panier depuis localStorage (cote client uniquement)
  useEffect(() => {
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart && Array.isArray(savedCart.items)) {
      setCart(savedCart.items);
    }
  }, []);

  // Fermer la modale avec Échap
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedRestaurant(null);
    setMenu([]);
    setMenuLoading(false);
    setError(null);
  };

  const handleRestaurantClick = async (restaurant) => {
    // Vérifier si l'utilisateur est connecté
    if (!user) {
      alert('Vous devez être connecté pour commander. Veuillez vous inscrire ou vous connecter.');
      router.push('/login');
      return;
    }

    try {
      setMenuLoading(true);
      setError(null);
      setSelectedRestaurant(restaurant);
      setIsModalOpen(true);
      const [restaurantResponse, menuResponse] = await Promise.all([
        fetch(`/api/restaurants/${restaurant.id}`),
        fetch(`/api/restaurants/${restaurant.id}/menu`)
      ]);
      
      if (!restaurantResponse.ok) {
        const text = await restaurantResponse.text();
        throw new Error(text || 'Erreur lors du chargement du restaurant');
      }
      if (!menuResponse.ok) {
        const text = await menuResponse.text();
        throw new Error(text || 'Erreur lors du chargement du menu');
      }
      
      const contentType1 = restaurantResponse.headers.get('content-type');
      const contentType2 = menuResponse.headers.get('content-type');
      if (!contentType1?.includes('application/json') || !contentType2?.includes('application/json')) {
        throw new Error('Réponse inattendue du serveur (pas du JSON)');
      }
      
      const restaurantData = await restaurantResponse.json();
      const menuData = await menuResponse.json();
      setSelectedRestaurant(restaurantData);
      setMenu(menuData);
    } catch (error) {
      setError(error.message);
      setMenu([]);
    } finally {
      setMenuLoading(false);
    }
  };

  const addToCart = async (item) => {
    // Verifier si l'utilisateur est connecte
    if (!user) {
      alert('Vous devez etre connecte pour ajouter des articles au panier.');
      router.push('/login');
      return;
    }

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
        restaurant: selectedRestaurant,
        frais_livraison: deliveryFee
      };
      safeLocalStorage.setJSON('cart', cartData);
      
      return newCart;
    });
  };

  const getDeliveryFee = () => {
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart && savedCart.frais_livraison !== undefined) {
      return savedCart.frais_livraison;
    }
    return restaurant?.deliveryFee || restaurant?.frais_livraison || 2.50;
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

  const toggleFavorite = (restaurantId) => {
    setFavorites(prev => {
      const newFavorites = prev.includes(restaurantId)
        ? prev.filter(id => id !== restaurantId)
        : [...prev, restaurantId];
      
      safeLocalStorage.setJSON('favorites', newFavorites);
      return newFavorites;
    });
  };

  const categories = [
    { id: 'all', name: 'Tous', icon: '🍽️' },
    { id: 'pizza', name: 'Pizza', icon: '🍕' },
    { id: 'burger', name: 'Burgers', icon: '🍔' },
    { id: 'sushi', name: 'Sushi', icon: '🍣' },
    { id: 'salade', name: 'Salades', icon: '🥗' },
    { id: 'dessert', name: 'Desserts', icon: '🍰' },
    { id: 'boisson', name: 'Boissons', icon: '🥤' }
  ];

  // Filtrage et tri des restaurants
  const filteredAndSortedRestaurants = (restaurants || [])
    .filter(restaurant => {
      const matchesSearch = restaurant.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           restaurant.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || restaurant.categorie === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const now = new Date();
      const aSponsor = a.mise_en_avant && a.mise_en_avant_fin && new Date(a.mise_en_avant_fin) > now;
      const bSponsor = b.mise_en_avant && b.mise_en_avant_fin && new Date(b.mise_en_avant_fin) > now;
      
      switch (sortBy) {
        case 'recommended':
          if (aSponsor !== bSponsor) return aSponsor ? -1 : 1;
          return (b.rating || 0) - (a.rating || 0);
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

  // Récupérer les frais de livraison depuis le localStorage
  const getFraisLivraison = () => {
    const savedCart = safeLocalStorage.getJSON('cart');
    if (savedCart) {
      try {
        return savedCart.frais_livraison || 2.50;
      } catch (e) {
        console.error('Erreur lecture frais livraison:', e);
      }
    }
    return 2.50; // Prix par défaut pour Ganges
  };

  const cartTotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  const fraisLivraison = getDeliveryFee();
  const totalAvecLivraison = cartTotal + fraisLivraison;
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center px-4 bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-lg">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Une erreur est survenue</h1>
          <p className="text-gray-700 mb-6">Impossible de charger les restaurants pour le moment.</p>
          <p className="text-sm text-gray-500 mb-6">Détail de l'erreur : {error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
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
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white max-w-2xl">
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Découvrez les meilleurs restaurants
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-gray-200">
              Livraison rapide et repas délicieux à votre porte
            </p>
            
            {/* Barre de recherche améliorée */}
            <div className="bg-white rounded-xl p-4 shadow-lg max-w-lg">
              <div className="flex items-center space-x-3">
                <FaSearch className="h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Nom du restaurant, cuisine, plat..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1 px-3 py-2 outline-none text-gray-900 placeholder-gray-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <FaTimes className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Suggestions rapides */}
              {searchTerm.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex flex-wrap gap-2">
                    {['Pizza', 'Burger', 'Sushi', 'Salade'].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setSearchTerm(suggestion)}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex gap-4 mt-6">
              <button 
                onClick={() => router.push('/restaurants')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Commander maintenant
              </button>
              <button 
                onClick={() => router.push('/restaurants')}
                className="bg-white hover:bg-gray-100 text-orange-600 px-8 py-4 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
              >
                Voir les restaurants
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filtres et tri */}
      <section className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <FaFilter className="h-4 w-4" />
                <span>Filtres</span>
              </button>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="recommended">Recommandés</option>
                <option value="rating">Mieux notés</option>
                <option value="delivery_time">Plus rapides</option>
                <option value="distance">Plus proches</option>
              </select>
            </div>
            
            <div className="text-gray-600">
              {filteredAndSortedRestaurants.length} restaurant{filteredAndSortedRestaurants.length !== 1 ? 's' : ''} trouvé{filteredAndSortedRestaurants.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Filtres avancés */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Section des restaurants */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            {filteredAndSortedRestaurants.map((restaurant) => (
              <div
                key={restaurant.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 transform hover:scale-105 overflow-hidden cursor-pointer group"
                onClick={() => handleRestaurantClick(restaurant)}
              >
                <div className="relative h-48">
                  <Image
                    src={restaurant.imageUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'}
                    alt={restaurant.nom}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    unoptimized
                  />
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-col space-y-2">
                    {restaurant.mise_en_avant && restaurant.mise_en_avant_fin && new Date(restaurant.mise_en_avant_fin) > new Date() && (
                      <span className="bg-yellow-400 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                        ⭐ Sponsorisé
                      </span>
                    )}
                    {favorites.includes(restaurant.id) && (
                      <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                        ❤️ Favori
                      </span>
                    )}
                  </div>
                  
                  {/* Bouton favori */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(restaurant.id);
                    }}
                    className="absolute top-3 right-3 p-2 bg-white bg-opacity-90 rounded-full hover:bg-opacity-100 transition-all duration-200"
                  >
                    <FaHeart className={`h-4 w-4 ${favorites.includes(restaurant.id) ? 'text-red-500' : 'text-gray-400'}`} />
                  </button>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-xl font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {restaurant.nom}
                    </h3>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">{restaurant.description}</p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-4 text-gray-500">
                      <div className="flex items-center">
                        <FaStar className="h-4 w-4 text-yellow-400 mr-1" />
                        <span>{restaurant.rating || '4.5'}</span>
                      </div>
                      <div className="flex items-center">
                        <FaClock className="h-4 w-4 mr-1" />
                        <span>{restaurant.deliveryTime} min</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {restaurant.frais_livraison ? `${restaurant.frais_livraison}€` : 'Gratuit'}
                      </p>
                      <p className="text-xs text-gray-500">Commande min: {restaurant.minOrder}€</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal améliorée */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {selectedRestaurant?.nom || 'Chargement...'}
                  </h2>
                  <p className="text-gray-600 mb-3">{selectedRestaurant?.description}</p>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <div className="flex items-center">
                      <FaStar className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>{selectedRestaurant?.rating || '4.5'}</span>
                    </div>
                    <div className="flex items-center">
                      <FaClock className="h-4 w-4 mr-1" />
                      <span>{selectedRestaurant?.deliveryTime} min</span>
                    </div>
                    <div className="flex items-center">
                      <FaMotorcycle className="h-4 w-4 mr-1" />
                      <span>{selectedRestaurant?.frais_livraison ? `${selectedRestaurant.frais_livraison}€` : 'Gratuit'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Fermer la modale"
                >
                  <FaTimes className="h-6 w-6" />
                </button>
              </div>
              
              {menuLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : error ? (
                <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg">
                  <p>{error}</p>
                  <button onClick={closeModal} className="mt-4 px-4 py-2 bg-gray-200 rounded">Fermer</button>
                </div>
              ) : selectedRestaurant && Array.isArray(menu) && menu.length > 0 ? (
                <div className="space-y-8">
                  {/* Menu */}
                  <div>
                    <h3 className="text-2xl font-semibold mb-6 text-gray-900">Menu</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {Array.isArray(menu) && menu.map((item) => (
                        <div key={item.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h5 className="font-semibold text-gray-900 mb-1">{item.name}</h5>
                              <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                              <p className="text-lg font-bold text-blue-600">{item.price}€</p>
                            </div>
                            <button
                              onClick={() => addToCart(item)}
                              className="ml-4 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                            >
                              <FaPlus className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Panier amélioré */}
                  {cart.length > 0 && (
                    <div className="border-t pt-6">
                      <h3 className="text-2xl font-semibold mb-4 text-gray-900">Votre panier</h3>
                      <div className="space-y-4">
                        {cart.map((item) => (
                          <div key={item.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-600">{item.price}€ x {item.quantity}</p>
                            </div>
                            <div className="flex items-center space-x-3">
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <FaMinus className="h-3 w-3" />
                              </button>
                              <span className="font-semibold text-gray-900 min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="text-gray-500 hover:text-gray-700 p-1"
                              >
                                <FaPlus className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <FaTimes className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                        
                        <div className="border-t pt-4">
                          <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Sous-total</span>
                              <span>{cartTotal.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center text-gray-600">
                              <span>Frais de livraison</span>
                              <span>{fraisLivraison.toFixed(2)}€</span>
                            </div>
                            <div className="border-t pt-2">
                              <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold text-gray-900">Total</span>
                                <span className="text-2xl font-bold text-blue-600">
                                  {totalAvecLivraison.toFixed(2)}€
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              router.push('/checkout');
                              closeModal();
                            }}
                            className="w-full bg-blue-600 text-white py-4 rounded-lg hover:bg-blue-700 transition-colors font-semibold text-lg"
                          >
                            Passer la commande ({cartItemCount} article{cartItemCount !== 1 ? 's' : ''})
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-12">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FaSearch className="h-8 w-8 text-gray-400" />
                  </div>
                  <p>Aucun menu disponible pour ce restaurant.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Desactiver le rendu statique pour cette page
export const dynamic = 'force-dynamic'; 