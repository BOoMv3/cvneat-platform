'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MenuByCategories({ restaurantId }) {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMenuData();
  }, [restaurantId]);

  const fetchMenuData = async () => {
    try {
      // Récupérer les catégories
      const { data: categoriesData } = await supabase
        .from('menu_categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('sort_order');

      // Récupérer les éléments de menu
      const { data: menuData } = await supabase
        .from('menus')
        .select('*, menu_categories(name)')
        .eq('restaurant_id', restaurantId)
        .order('name');

      setCategories(categoriesData || []);
      setMenuItems(menuData || []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur lors de la récupération du menu:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Chargement du menu...</p>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Aucun menu disponible pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryItems = menuItems.filter(item => item.category_id === category.id);
        if (categoryItems.length === 0) return null;

        return (
          <div key={category.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* En-tête de catégorie */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <span className="mr-2">📂</span>
                {category.name}
              </h2>
              {category.description && (
                <p className="text-sm text-gray-600 mt-1">{category.description}</p>
              )}
            </div>

            {/* Grille des éléments de menu */}
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryItems.map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-shadow">
                    {/* Image du plat */}
                    {item.image_url && (
                      <div className="mb-4">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Informations du plat */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                        <span className="text-xl font-bold text-green-600">{item.price}€</span>
                      </div>
                      
                      {item.description && (
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {item.description}
                        </p>
                      )}

                      {/* Bouton d'ajout au panier */}
                      <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        + Ajouter au panier
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
} 