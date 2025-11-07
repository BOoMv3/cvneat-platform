'use client';
import { useState } from 'react';
import MenuItem from './MenuItem';
import { FaUtensils, FaHamburger, FaPizzaSlice, FaIceCream, FaCoffee, FaWineGlass, FaBreadSlice, FaLeaf } from 'react-icons/fa';

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

  // Ordre personnalisé des catégories (ordre logique d'un repas)
  const getCategoryOrder = (category) => {
    const catLower = category.toLowerCase();
    
    // Formules (0) - Afficher en premier
    if (catLower === 'formule' || catLower === 'formules') {
      return 0;
    }
    // Entrées (1)
    if (catLower.includes('entree') || catLower.includes('entrée') || catLower === 'entrées' || catLower === 'entrees') {
      return 1;
    }
    // Sandwiches (1.5) - Entre entrées et plats
    if (catLower.includes('sandwich') || catLower === 'sandwiches') {
      return 1.5;
    }
    // Puccias (2) - assimilé à un plat principal
    if (catLower.includes('puccia')) {
      return 2;
    }
    // Plats (2)
    if (catLower === 'plat' || catLower === 'plats' || catLower.includes('plat principal')) {
      return 2;
    }
    // Desserts (3)
    if (catLower.includes('dessert')) {
      return 3;
    }
    // Boissons (4)
    if (catLower.includes('boisson') || catLower.includes('drink') || catLower === 'boissons') {
      return 4;
    }
    // Burgers (2.5)
    if (catLower.includes('burger')) {
      return 2.5;
    }
    // Poke Bowl (2.7)
    if (catLower.includes('poke')) {
      return 2.7;
    }
    // Salades (2.8)
    if (catLower.includes('salade')) {
      return 2.8;
    }
    // Autres catégories spécifiques (5)
    if (catLower.includes('kebab') || catLower.includes('panini') || catLower.includes('taco') || catLower.includes('pizza')) {
      return 2; // Considérer comme plats
    }
    // Autres (99)
    return 99;
  };
  
  // Trier les catégories selon l'ordre personnalisé
  const categories = Object.keys(menuByCategory).sort((a, b) => {
    const orderA = getCategoryOrder(a);
    const orderB = getCategoryOrder(b);
    
    // Si même ordre, tri alphabétique
    if (orderA === orderB) {
      return a.localeCompare(b);
    }
    
    return orderA - orderB;
  });

  // Icônes pour les catégories
  const categoryIcons = {
    'Formules': FaUtensils,
    'formule': FaUtensils,
    'Formule': FaUtensils,
    'formules': FaUtensils,
    'Entrées': FaLeaf,
    'entree': FaLeaf,
    'Entree': FaLeaf,
    'entrées': FaLeaf,
    'Sandwich': FaBreadSlice,
    'sandwich': FaBreadSlice,
    'Sandwiches': FaBreadSlice,
    'sandwiches': FaBreadSlice,
    'Plats': FaUtensils,
    'plat': FaUtensils,
    'Plat': FaUtensils,
    'plats': FaUtensils,
    'Desserts': FaIceCream,
    'dessert': FaIceCream,
    'Dessert': FaIceCream,
    'desserts': FaIceCream,
    'Boissons': FaCoffee,
    'boisson': FaCoffee,
    'Boisson': FaCoffee,
    'boissons': FaCoffee,
    'Burger': FaHamburger,
    'burger': FaHamburger,
    'Burgers': FaHamburger,
    'burgers': FaHamburger,
    'Poke Bowl': FaUtensils,
    'poke bowl': FaUtensils,
    'Poke Bowls': FaUtensils,
    'poke bowls': FaUtensils,
    'Salade': FaLeaf,
    'salade': FaLeaf,
    'Salades': FaLeaf,
    'salades': FaLeaf,
    'Kebab': FaHamburger,
    'Kebabs': FaHamburger,
    'Panini': FaBreadSlice,
    'Paninis': FaBreadSlice,
    'Tacos': FaUtensils,
    'Pizza': FaPizzaSlice,
    'Pizzas': FaPizzaSlice,
    'Puccias': FaBreadSlice,
    'puccias': FaBreadSlice,
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
    <div className="space-y-10">
      {/* Filtres par catégorie - Design amélioré avec scroll horizontal */}
      <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 pb-6 pt-4 -mt-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap md:flex-nowrap gap-3 md:overflow-x-auto overflow-visible pb-2 scrollbar-hide px-1">
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
            <div key={category} className="space-y-6">
              {/* En-tête de catégorie avec icône - Design épuré */}
              <div className="flex items-center gap-4 pb-3 border-b-2 border-orange-200 dark:border-orange-800">
                <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-xl shadow-sm">
                  <Icon className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {menuByCategory[category].length} produit{menuByCategory[category].length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {/* Grille de produits - Design épuré avec moins de colonnes et plus d'espace */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
                {menuByCategory[category].map((item) => (
                  <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                ))}
              </div>
              
              {/* Séparateur entre catégories (sauf dernière) - Plus d'espace */}
              {index < categories.length - 1 && (
                <div className="my-12 border-t-2 border-gray-200 dark:border-gray-700"></div>
              )}
            </div>
          );
        })
      ) : (
        // Afficher seulement la catégorie sélectionnée
        <div className="space-y-6">
          <div className="flex items-center gap-4 pb-3 border-b-2 border-orange-200 dark:border-orange-800">
            <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-xl shadow-sm">
              {(() => {
                const Icon = getCategoryIcon(selectedCategory);
                return <Icon className="w-7 h-7 text-orange-600 dark:text-orange-400" />;
              })()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedCategory}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {menuByCategory[selectedCategory]?.length || 0} produit{(menuByCategory[selectedCategory]?.length || 0) > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
            {menuByCategory[selectedCategory]?.map((item) => (
              <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
