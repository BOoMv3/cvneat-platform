'use client';
import { useMemo, useEffect, useState, useCallback } from 'react';
import MenuItem from './MenuItem';
import { FaUtensils, FaHamburger, FaPizzaSlice, FaIceCream, FaCoffee, FaWineGlass, FaBreadSlice, FaLeaf, FaChevronDown } from 'react-icons/fa';

export default function MenuByCategories({ menu, selectedCategory, onCategorySelect, onAddToCart, restaurantId }) {
  // Grouper les menus par catégorie
  const menuByCategory = useMemo(() => {
    return menu.reduce((acc, item) => {
      const category = item.category || item.categorie || 'Autres';

      if (!acc[category]) {
        acc[category] = [];
      }

      acc[category].push(item);
      return acc;
    }, {});
  }, [menu]);

  const specialSelections = [
    {
      id: 'pizza-du-moment',
      label: 'Pizza du moment',
      icon: FaPizzaSlice,
      match: (item) => {
        const label = `${item.category || ''} ${item.nom || ''}`.toLowerCase();
        return label.includes('pizza du moment');
      }
    }
  ];

  const specialCategories = specialSelections.reduce((acc, selection) => {
    const items = menu.filter(selection.match);
    if (items.length > 0) {
      acc.push({
        id: selection.id,
        label: selection.label,
        icon: selection.icon,
        items
      });
    }
    return acc;
  }, []);

  const specialCategoryMap = specialCategories.reduce((acc, category) => {
    acc[category.id] = category;
    return acc;
  }, {});

  // Ordre personnalisé des catégories (ordre logique d'un repas)
  const categories = useMemo(() => {
    return Object.keys(menuByCategory).sort((a, b) => {
      const orderA = getCategoryOrder(a);
      const orderB = getCategoryOrder(b);

      // Si même ordre, tri alphabétique
      if (orderA === orderB) {
        return a.localeCompare(b);
      }

      return orderA - orderB;
    });
  }, [menuByCategory]);

  const [isMobile, setIsMobile] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState(() => new Set());

  useEffect(() => {
    const updateIsMobile = () => {
      if (typeof window === 'undefined') return;
      setIsMobile(window.innerWidth < 768);
    };

    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  useEffect(() => {
    setExpandedCategories((prev) => {
      if (!isMobile) {
        const next = new Set();
        if (specialCategories.length > 0) {
          next.add('__special__');
        }
        categories.forEach((category) => next.add(category));

        if (prev.size === next.size && [...next].every((key) => prev.has(key))) {
          return prev;
        }

        return next;
      }

      if (prev.size > 0) {
        return prev;
      }

      const initial = new Set();
      if (specialCategories.length > 0) {
        initial.add('__special__');
      }
      if (categories.length > 0) {
        initial.add(categories[0]);
      }
      return initial;
    });
  }, [isMobile, categories, specialCategories]);

  const toggleCategory = useCallback((key) => {
    if (!isMobile) return;
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, [isMobile]);

  const isCategoryExpanded = useCallback((key) => {
    if (!isMobile) return true;
    return expandedCategories.has(key);
  }, [isMobile, expandedCategories]);

  // Ordre personnalisé des catégories (ordre logique d'un repas)
  function getCategoryOrder(category) {
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
  }
  
  // Icônes pour les catégories
  const categoryIcons = {
    'pizza-du-moment': FaPizzaSlice,
    'Pizza du moment': FaPizzaSlice,
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
        <div className="flex gap-3 overflow-x-auto sm:flex-wrap sm:overflow-visible md:flex-nowrap pb-2 scrollbar-hide px-1">
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
          {specialCategories.map((category) => {
            const Icon = category.icon || getCategoryIcon(category.label);
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-orange-500 to-amber-600 text-white shadow-lg transform scale-105'
                    : 'bg-purple-100/40 dark:bg-purple-900/40 text-purple-700 dark:text-purple-200 hover:bg-purple-200/50 dark:hover:bg-purple-800/60'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{category.label}</span>
                <span className="text-xs opacity-75">({category.items.length})</span>
              </button>
            );
          })}

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
        <>
          {specialCategories.length > 0 && (
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => toggleCategory('__special__')}
                className={`w-full flex items-center gap-4 pb-3 border-b-2 border-purple-200 dark:border-purple-800 text-left ${isMobile ? 'cursor-pointer focus:outline-none' : 'cursor-default'}`}
              >
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl shadow-sm">
                  <FaPizzaSlice className="w-7 h-7 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sélection spéciale</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Découvre les nouveautés et suggestions du chef
                  </p>
                </div>
                {isMobile && (
                  <FaChevronDown
                    className={`ml-auto text-purple-600 dark:text-purple-300 transition-transform ${isCategoryExpanded('__special__') ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {isCategoryExpanded('__special__') && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
                    {specialCategories.flatMap(({ items }) =>
                      items.map((item) => (
                        <MenuItem key={`special-${item.id}`} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                      ))
                    )}
                  </div>

                  <div className="my-12 border-t-2 border-gray-200 dark:border-gray-700"></div>
                </>
              )}
            </div>
          )}

          {categories.map((category, index) => {
            const Icon = getCategoryIcon(category);
            const categoryKey = category;
            const expanded = isCategoryExpanded(categoryKey);
            return (
              <div key={category} className="mb-12 last:mb-0">
                <button
                  type="button"
                  onClick={() => toggleCategory(categoryKey)}
                  className={`w-full flex items-center gap-4 pb-3 border-b-2 border-orange-200 dark:border-orange-800 text-left ${isMobile ? 'cursor-pointer focus:outline-none' : 'cursor-default'}`}
                >
                  <div className="p-3 bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900 dark:to-amber-900 rounded-xl shadow-sm">
                    <Icon className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{category}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {menuByCategory[category].length} produit{menuByCategory[category].length > 1 ? 's' : ''}
                    </p>
                  </div>
                  {isMobile && (
                    <FaChevronDown
                      className={`ml-auto text-orange-600 dark:text-orange-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </button>

                {expanded && (
                  <>
                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
                      {menuByCategory[category].map((item) => (
                        <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                      ))}
                    </div>
                    {index < categories.length - 1 && (
                      <div className="mt-12 border-t-2 border-gray-200 dark:border-gray-700"></div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </>
      ) : (
        // Afficher seulement la catégorie sélectionnée
        <div className="space-y-6">
          {specialCategoryMap[selectedCategory] ? (
            <>
              <div className="flex items-center gap-4 pb-3 border-b-2 border-purple-200 dark:border-purple-800">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl shadow-sm">
                  <FaPizzaSlice className="w-7 h-7 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{specialCategoryMap[selectedCategory].label}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {specialCategoryMap[selectedCategory].items.length} produit{specialCategoryMap[selectedCategory].items.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
                {specialCategoryMap[selectedCategory].items.map((item) => (
                  <MenuItem key={item.id} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                ))}
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
