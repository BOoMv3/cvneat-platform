'use client';
import { useMemo } from 'react';
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
  const getCategoryOrder = (category) => {
    const catLower = category.toLowerCase();
    
    // Spécial Noël (-1) - Toujours en premier
    if (catLower.includes('noël') || catLower.includes('noel') || catLower.includes('spécial')) {
      return -1;
    }
    
    // Formules (0) - Afficher en premier
    if (catLower === 'formule' || catLower === 'formules' || catLower === 'menus') {
      return 0;
    }
    
    // ========== CATÉGORIES MOLOKAI (Sushi/Poke) ==========
    // Signatures x6 (1)
    if (catLower.includes('signatures x6') || catLower === 'signatures') {
      return 1;
    }
    // Sushi Nigiri x2 (1.1)
    if (catLower.includes('sushi nigiri') || catLower.includes('nigiri')) {
      return 1.1;
    }
    // Spring Rolls x6 (1.2)
    if (catLower.includes('spring rolls')) {
      return 1.2;
    }
    // Salmon Aburi Rolls x6 (1.3)
    if (catLower.includes('salmon aburi') || catLower.includes('aburi rolls')) {
      return 1.3;
    }
    // Makis x6 (1.4)
    if (catLower.includes('makis x6') || (catLower.includes('makis') && !catLower.includes('california'))) {
      return 1.4;
    }
    // California x6 (1.5)
    if (catLower.includes('california x6') || catLower.includes('california')) {
      return 1.5;
    }
    // Les Crispy x6 (1.6)
    if (catLower.includes('crispy x6') || catLower.includes('les crispy')) {
      return 1.6;
    }
    // Accompagnements (1.7)
    if (catLower.includes('accompagnements') || catLower.includes('accompagnement')) {
      return 1.7;
    }
    // Les Pokes Signatures (1.8)
    if (catLower.includes('pokes signatures') || (catLower.includes('poke') && catLower.includes('signature'))) {
      return 1.8;
    }
    // Les Plateaux (1.9)
    if (catLower.includes('plateaux') || catLower.includes('plateau')) {
      return 1.9;
    }
    // Compose ton Poke Bowl (1.95)
    if (catLower.includes('compose ton poke') || catLower.includes('compose ton bowl')) {
      return 1.95;
    }
    
    // ========== CATÉGORIES GÉNÉRALES ==========
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
    // Burgers (2.5)
    if (catLower.includes('burger')) {
      return 2.5;
    }
    // Poke Bowl générique (2.7) - Si pas déjà catégorisé
    if (catLower.includes('poke') && !catLower.includes('signature') && !catLower.includes('compose')) {
      return 2.7;
    }
    // Salades (2.8)
    if (catLower.includes('salade')) {
      return 2.8;
    }
    // Desserts (3) - Avant boissons
    if (catLower.includes('dessert')) {
      return 3;
    }
    // Boissons (4) - À la fin
    if (catLower.includes('boisson') || catLower.includes('drink') || catLower === 'boissons' || catLower.includes('la sélection')) {
      return 4;
    }
    // Sauces et Suppléments (4.5) - Après boissons
    if (catLower.includes('sauce') || catLower.includes('supplément') || catLower.includes('supplement')) {
      return 4.5;
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
      <div className="sticky top-16 sm:top-20 z-30 bg-white dark:bg-gray-900 -mt-2 pb-3 pt-4 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto sm:overflow-x-visible scrollbar-hide px-1 sm:px-2">
          <button
            onClick={() => onCategorySelect('all')}
            className={`flex-none inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all ${
              selectedCategory === 'all'
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg border-transparent'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <FaUtensils className="w-4 h-4" />
            <span className="whitespace-nowrap">Tous</span>
            <span className="text-xs opacity-75 whitespace-nowrap">({menu.length})</span>
          </button>
          {specialCategories.map((category) => {
            const Icon = category.icon || getCategoryIcon(category.label);
            return (
              <button
                key={category.id}
                onClick={() => onCategorySelect(category.id)}
                className={`flex-none inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all ${
                  selectedCategory === category.id
                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg border-transparent'
                    : 'bg-white dark:bg-gray-800 text-purple-700 dark:text-purple-200 border-purple-100 dark:border-purple-800 hover:bg-purple-50/80 dark:hover:bg-purple-900/40'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{category.label}</span>
                <span className="text-xs opacity-75 whitespace-nowrap">({category.items.length})</span>
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
                className={`flex-none inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border text-sm font-semibold transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg border-transparent'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="whitespace-nowrap">{category}</span>
                <span className="text-xs opacity-75 whitespace-nowrap">({count})</span>
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
            <div className="space-y-6">
              <div className="flex items-center gap-4 pb-3 border-b-2 border-purple-200 dark:border-purple-800">
                <div className="p-3 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 rounded-xl shadow-sm">
                  <FaPizzaSlice className="w-7 h-7 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Sélection spéciale</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Découvre les nouveautés et suggestions du chef
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-6">
                {specialCategories.map(({ items }) =>
                  items.map((item) => (
                    <MenuItem key={`special-${item.id}`} item={item} onAddToCart={onAddToCart} restaurantId={restaurantId} />
                  ))
                )}
              </div>

              <div className="my-12 border-t-2 border-gray-200 dark:border-gray-700"></div>
            </div>
          )}

          {categories.map((category, index) => {
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
