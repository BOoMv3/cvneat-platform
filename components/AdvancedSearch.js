'use client';

import { useState, useEffect } from 'react';
import { FaSearch, FaFilter, FaStar, FaClock, FaMotorcycle } from 'react-icons/fa';

export default function AdvancedSearch({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    cuisine: '',
    rating: '',
    deliveryTime: '',
    priceRange: '',
    isOpen: false,
    hasDelivery: true
  });
  const [showFilters, setShowFilters] = useState(false);

  const cuisines = [
    'Italien', 'Chinois', 'Japonais', 'Indien', 'Mexicain', 
    'Français', 'Thaï', 'Libanais', 'Grec', 'Américain'
  ];

  const handleSearch = () => {
    onSearch({
      searchTerm,
      ...filters
    });
  };

  const clearFilters = () => {
    setFilters({
      cuisine: '',
      rating: '',
      deliveryTime: '',
      priceRange: '',
      isOpen: false,
      hasDelivery: true
    });
    setSearchTerm('');
  };

  useEffect(() => {
    handleSearch();
  }, [filters]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 mb-6">
      {/* Barre de recherche principale */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher un restaurant, un plat..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          <FaFilter className="inline-block mr-2" />
          Filtres
        </button>
      </div>

      {/* Filtres avancés */}
      {showFilters && (
        <div className="border-t pt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Type de cuisine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Type de cuisine
              </label>
              <select
                value={filters.cuisine}
                onChange={(e) => setFilters({...filters, cuisine: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Toutes les cuisines</option>
                {cuisines.map(cuisine => (
                  <option key={cuisine} value={cuisine}>{cuisine}</option>
                ))}
              </select>
            </div>

            {/* Note minimum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Note minimum
              </label>
              <select
                value={filters.rating}
                onChange={(e) => setFilters({...filters, rating: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Toutes les notes</option>
                <option value="4">4+ étoiles</option>
                <option value="3">3+ étoiles</option>
                <option value="2">2+ étoiles</option>
              </select>
            </div>

            {/* Temps de livraison */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Temps de livraison
              </label>
              <select
                value={filters.deliveryTime}
                onChange={(e) => setFilters({...filters, deliveryTime: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tous les temps</option>
                <option value="15">Moins de 15 min</option>
                <option value="30">Moins de 30 min</option>
                <option value="45">Moins de 45 min</option>
              </select>
            </div>

            {/* Fourchette de prix */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fourchette de prix
              </label>
              <select
                value={filters.priceRange}
                onChange={(e) => setFilters({...filters, priceRange: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="">Tous les prix</option>
                <option value="low">€ (Économique)</option>
                <option value="medium">€€ (Moyen)</option>
                <option value="high">€€€ (Premium)</option>
              </select>
            </div>
          </div>

          {/* Options supplémentaires */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.isOpen}
                onChange={(e) => setFilters({...filters, isOpen: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <FaClock className="inline-block mr-1" />
                Ouverts maintenant
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.hasDelivery}
                onChange={(e) => setFilters({...filters, hasDelivery: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                <FaMotorcycle className="inline-block mr-1" />
                Livraison disponible
              </span>
            </label>
          </div>

          {/* Boutons d'action */}
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Rechercher
            </button>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Effacer les filtres
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 