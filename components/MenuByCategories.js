'use client';
import { useState } from 'react';
import MenuItem from './MenuItem';
import { FaUtensils, FaHamburger, FaPizzaSlice, FaIceCream, FaCoffee, FaWineGlass, FaBreadSlice } from 'react-icons/fa';

export default function MenuByCategories({ menu, selectedCategory, onCategorySelect, onAddToCart, restaurantId }) {
  // Grouper les menus par catégorie
  const menuByCategory = menu.reduce((acc, item) => {
    const category = item.category || item.categorie || 'Autres';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  const categories = Object.keys(menuByCategory).sort();

  // Icônes pour les catégories
  const categoryIcons = {
    'Kebab': FaHamburger,
    'Kebabs': FaHamburger,
    'Panini': FaBreadSlice,
    'Paninis': FaBreadSlice,
    'Tacos': FaUtensils,
    'Pizza': FaPizzaSlice,
    'Pizzas': FaPizzaSlice,
    'Desserts': FaIceCream,
    'Boissons': FaCoffee,
    'Boisson': FaCoffee,
    'Vins': FaWineGlass,
    'Autres': FaUtensils
  };

  const getCategoryIcon = (category) => {
    return categoryIcons[category] || FaUtensils;
  };

  if (menu.length === 0) {
    return (
      <div className="text-center text-gray-500 dark:text-gray-400 py-12">
        <FaUtensils className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <p className="text-lg">Aucun plat disponible pour ce restaurant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtres par catégorie - Design amélioré avec scroll horizontal */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-4 pt-2 -mt-2">
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-1">
          <button
            onClick={() => onCategorySelect('all')}
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <FaUtensils className="w-4 h-4" />
            <span>Tous</span>
            <span className="text-xs opacity-75">({menu.length})</span>
          </button>
          {categories.map((category) => {
            const Icon = getCategoryIcon(category);
            const count = menuByCategory[category].length;
            return (
              <button
                key={category}
                onClick={() => onCategorySelect(category)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Affichage des menus */}
      {selectedCategory === 'all' ? (
        // Afficher tous les menus groupés par catégorie avec séparateurs clairs
        categories.map((category, index) => {
          const Icon = getCategoryIcon(category);
          return (
            <div key={category} className="space-y-4">
              {/* En-tête de catégorie avec icône */}
              <div className="flex items-center gap-3 pb-2 border-b-2 border-orange-200 dark:border-orange-800">
                <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-lg">
                  <Icon className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {menuByCategory[category].length} produit{menuByCategory[category].length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {/* Grille de produits */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {menuByCategory[category].map((item) => (
                  <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                ))}
              </div>
              
              {/* Séparateur entre catégories (sauf dernière) */}
              {index < categories.length - 1 && (
                <div className="my-8 border-t border-gray-200 dark:border-gray-700"></div>
              )}
            </div>
          );
        })
      ) : (
        // Afficher seulement la catégorie sélectionnée
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-orange-200 dark:border-orange-800">
            <div className="p-2 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-lg">
              {(() => {
                const Icon = getCategoryIcon(selectedCategory);
                return <Icon className="w-6 h-6 text-orange-600 dark:text-orange-400" />;
              })()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCategory}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {menuByCategory[selectedCategory]?.length || 0} produit{(menuByCategory[selectedCategory]?.length || 0) > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {menuByCategory[selectedCategory]?.map((item) => (
              <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
