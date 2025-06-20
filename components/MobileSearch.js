'use client';

import { useState, useEffect, useRef } from 'react';
import { FaSearch, FaFilter, FaTimes, FaMapMarkerAlt, FaClock, FaStar } from 'react-icons/fa';

export default function MobileSearch({ onSearch, onFilterChange }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cuisine: '',
    rating: '',
    deliveryTime: '',
    priceRange: '',
    isOpen: false,
    hasDelivery: true
  });
  
  const searchInputRef = useRef(null);

  const cuisines = [
    'Italien', 'Chinois', 'Japonais', 'Indien', 'Mexicain', 
    'Français', 'Thaï', 'Libanais', 'Grec', 'Américain'
  ];

  useEffect(() => {
    if (isExpanded && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSearch = () => {
    onSearch({
      searchTerm,
      ...filters
    });
    setIsExpanded(false);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      cuisine: '',
      rating: '',
      deliveryTime: '',
      priceRange: '',
      isOpen: false,
      hasDelivery: true
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
      {/* Barre de recherche principale */}
      <div className="px-4 py-3">
        <div className="flex items-center space-x-2">
          {/* Bouton de recherche */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-1 flex items-center space-x-3 bg-gray-100 rounded-full px-4 py-3 text-left"
          >
            <FaSearch className="text-gray-400 flex-shrink-0" />
            <span className="text-gray-500">
              {searchTerm || 'Rechercher un restaurant, un plat...'}
            </span>
          </button>

          {/* Bouton filtres */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-3 rounded-full transition-colors ${
              Object.values(filters).some(v => v && v !== true) 
                ? 'bg-black text-white' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <FaFilter className="w-4 h-4" />
          </button>
        </div>

        {/* Barre de recherche étendue */}
        {isExpanded && (
          <div className="mt-3 flex items-center space-x-2">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-black text-white px-4 py-2 rounded-lg font-medium"
            >
              Rechercher
            </button>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-2 text-gray-600"
            >
              <FaTimes className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Filtres mobiles */}
      {showFilters && (
        <div className="px-4 pb-4 space-y-4">
          {/* Filtres rapides */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleFilterChange('isOpen', !filters.isOpen)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filters.isOpen 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <FaClock className="inline-block mr-1" />
              Ouverts
            </button>
            
            <button
              onClick={() => handleFilterChange('hasDelivery', !filters.hasDelivery)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filters.hasDelivery 
                  ? 'bg-blue-100 text-blue-800' 
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <FaMapMarkerAlt className="inline-block mr-1" />
              Livraison
            </button>
          </div>

          {/* Filtres détaillés */}
          <div className="grid grid-cols-2 gap-3">
            {/* Type de cuisine */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Cuisine
              </label>
              <select
                value={filters.cuisine}
                onChange={(e) => handleFilterChange('cuisine', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Toutes</option>
                {cuisines.map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>

            {/* Note minimum */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Note min.
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Toutes</option>
                <option value="4">4+ étoiles</option>
                <option value="3">3+ étoiles</option>
                <option value="2">2+ étoiles</option>
              </select>
            </div>

            {/* Temps de livraison */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Livraison
              </label>
              <select
                value={filters.deliveryTime}
                onChange={(e) => handleFilterChange('deliveryTime', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Tous</option>
                <option value="15">-15 min</option>
                <option value="30">-30 min</option>
                <option value="45">-45 min</option>
              </select>
            </div>

            {/* Fourchette de prix */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Prix
              </label>
              <select
                value={filters.priceRange}
                onChange={(e) => handleFilterChange('priceRange', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
              >
                <option value="">Tous</option>
                <option value="low">€ Économique</option>
                <option value="medium">€€ Moyen</option>
                <option value="high">€€€ Premium</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2 pt-2">
            <button
              onClick={clearFilters}
              className="flex-1 px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Effacer
            </button>
            <button
              onClick={() => setShowFilters(false)}
              className="flex-1 px-4 py-2 text-sm bg-black text-white rounded-lg font-medium"
            >
              Appliquer
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 