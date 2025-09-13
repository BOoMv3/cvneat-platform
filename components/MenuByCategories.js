'use client';
import { useState } from 'react';
import MenuItem from './MenuItem';

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

  const categories = Object.keys(menuByCategory);

  if (menu.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <p>Aucun plat disponible pour ce restaurant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtres par catégorie */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => onCategorySelect('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            selectedCategory === 'all'
              ? 'bg-orange-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          Tous
        </button>
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => onCategorySelect(category)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectedCategory === category
                ? 'bg-orange-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Affichage des menus */}
      {selectedCategory === 'all' ? (
        // Afficher tous les menus groupés par catégorie
        categories.map((category) => (
          <div key={category} className="bg-white rounded-lg shadow-sm">
            <div className="px-6 py-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold text-gray-900">{category}</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {menuByCategory[category].map((item) => (
                  <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                ))}
              </div>
            </div>
          </div>
        ))
      ) : (
        // Afficher seulement la catégorie sélectionnée
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 bg-gray-50 border-b">
            <h2 className="text-xl font-semibold text-gray-900">{selectedCategory}</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {menuByCategory[selectedCategory]?.map((item) => (
                <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
