'use client';

import { useState, useEffect } from 'react';
import { FaPlus, FaThumbsUp, FaLock } from 'react-icons/fa';
import MenuItemModal from './MenuItemModal';
import { isLaBonnePateRestaurant } from '@/lib/restaurant-theme';

export default function MenuItem({ item, onAddToCart, restaurantId }) {
  const isLaBonnePate = isLaBonnePateRestaurant(restaurantId);
  const [isAdding, setIsAdding] = useState(false);
  const [itemRating, setItemRating] = useState(null);
  const [itemReviewCount, setItemReviewCount] = useState(null);
  const [popularNumber, setPopularNumber] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    id,
    nom,
    description,
    prix,
    image_url,
    rating,
    review_count,
    is_popular
  } = item;

  // Initialiser les valeurs une seule fois
  useEffect(() => {
    if (itemRating === null) {
      setItemRating(rating || Math.floor(Math.random() * 20) + 80);
    }
    if (itemReviewCount === null) {
      setItemReviewCount(review_count || Math.floor(Math.random() * 100) + 50);
    }
    if (popularNumber === null && is_popular) {
      setPopularNumber(Math.floor(Math.random() * 3) + 1);
    }
  }, [rating, review_count, itemRating, itemReviewCount, is_popular, popularNumber]);

  const handleAddToCart = async () => {
    // Debug: Log des options disponibles
    console.log('🔍 MenuItem - Item:', item.nom);
    console.log('🔍 MenuItem - meat_options:', item.meat_options, 'Type:', typeof item.meat_options, 'Length:', Array.isArray(item.meat_options) ? item.meat_options.length : 'N/A');
    console.log('🔍 MenuItem - sauce_options:', item.sauce_options, 'Type:', typeof item.sauce_options, 'Length:', Array.isArray(item.sauce_options) ? item.sauce_options.length : 'N/A');
    console.log('🔍 MenuItem - supplements:', item.supplements, 'Type:', typeof item.supplements, 'Length:', Array.isArray(item.supplements) ? item.supplements.length : 'N/A');
    
    // Normaliser les options pour la vérification (gérer les cas où c'est une string JSON)
    const normalizeArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) return value;
      if (typeof value === 'string') {
        try {
          const parsed = JSON.parse(value);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      return [];
    };
    
    const meatOptions = normalizeArray(item.meat_options);
    const sauceOptions = normalizeArray(item.sauce_options);
    const supplements = normalizeArray(item.supplements);
    const baseIngredients = normalizeArray(item.base_ingredients);
    
    console.log('✅ MenuItem - Options normalisées:', {
      meatOptions: meatOptions.length,
      sauceOptions: sauceOptions.length,
      supplements: supplements.length,
      baseIngredients: baseIngredients.length
    });
    
    // Vérifier si l'item a des options de personnalisation
    const hasCustomization = 
      item.is_formula || // Formules ont toujours besoin de la modal
      (item.drink_options && item.drink_options.length > 0) || // A des boissons
      meatOptions.length > 0 || // A des options de viande
      sauceOptions.length > 0 || // A des options de sauce
      supplements.length > 0 || // A des suppléments
      baseIngredients.length > 0 || // A des ingrédients modifiables
      (item.category && item.category.toLowerCase().includes('tacos')); // FORCER pour les tacos

    console.log('🔍 MenuItem - hasCustomization:', hasCustomization);

    // Si l'item a des options, ouvrir la modal au lieu d'ajouter directement
    if (hasCustomization) {
      console.log('✅ MenuItem - Ouverture de la modal');
      setIsModalOpen(true);
      return;
    }

    // Sinon, ajouter directement au panier
    setIsAdding(true);
    
    // IMPORTANT: Créer une copie de l'item sans suppléments pour éviter de réutiliser
    // les suppléments d'une instance précédente dans le panier
    const itemWithoutSupplements = {
      ...item,
      supplements: [] // Toujours commencer avec un tableau vide de suppléments
    };
    
    // Appeler la fonction d'ajout au panier avec un item sans suppléments
    onAddToCart(itemWithoutSupplements, [], null);
    
    // Garder l'animation active pendant 1.5 secondes
    setTimeout(() => {
      setIsAdding(false);
    }, 1500);
  };

  const handleItemClick = () => {
    // Ouvrir la modal pour tous les items, y compris les formules
    setIsModalOpen(true);
  };

  const handleModalAddToCart = (customizedItem, supplements = [], size = null, quantity = 1) => {
    // Fermer la modal immédiatement
    setIsModalOpen(false);
    // Ajouter au panier
    onAddToCart(customizedItem, supplements, size, quantity);
  };

  return (
    <>
      <div 
        className={`rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group ${
          isLaBonnePate
            ? 'lbp-menu-card border-[var(--lbp-border)]'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
        }`}
        onClick={handleItemClick}
      >
      {/* Image de l'article - Design épuré */}
      <div className={`relative h-48 w-full overflow-hidden ${
        isLaBonnePate
          ? 'bg-[var(--lbp-secondary)]'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600'
      }`}>
        {image_url ? (
          <img
            src={image_url}
            alt={nom}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              // Si l'image ne charge pas, afficher le placeholder
              e.target.style.display = 'none';
              const placeholder = e.target.parentElement.querySelector('.image-placeholder');
              if (placeholder) placeholder.style.display = 'flex';
            }}
          />
        ) : null}
        {(!image_url || image_url === '') && (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center image-placeholder">
            <span className="text-4xl opacity-50">🍽️</span>
          </div>
        )}

        {/* Badge populaire */}
        {is_popular && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            N°{popularNumber}
          </div>
        )}

        {/* Bouton d'ajout - Design épuré */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleAddToCart();
          }}
          disabled={isAdding}
          className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 ${
            isAdding
              ? 'bg-green-500 text-white scale-110 animate-pulse'
              : 'bg-white dark:bg-gray-800 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:scale-110'
          }`}
        >
          {isAdding ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <FaPlus className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Informations de l'article - Design minimaliste */}
      <div className="p-5 space-y-3">
        {/* Titre - Plus grand et visible */}
        <h3 className={`font-bold text-lg line-clamp-2 leading-tight ${
          isLaBonnePate ? 'font-display-lbp text-[var(--lbp-fg)]' : 'text-gray-900 dark:text-white'
        }`}>
          {nom}
          {item.is_formula && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
              Formule
            </span>
          )}
        </h3>

        {/* Description (formules ou carte La Bonne Pâte) */}
        {(item.is_formula || isLaBonnePate) && item.description && (
          <p className={`text-sm line-clamp-3 ${
            isLaBonnePate ? 'text-[var(--lbp-muted)] font-normal normal-case' : 'text-gray-600 dark:text-gray-400'
          }`}>
            {item.description}
          </p>
        )}

        {/* Liste des plats pour les formules */}
        {item.is_formula && item.formula_items && item.formula_items.length > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-medium">Composée de:</p>
            <ul className="list-disc list-inside ml-2">
              {item.formula_items.map((formulaItem, idx) => (
                <li key={idx}>
                  {formulaItem.quantity || 1}x {formulaItem.menu?.nom || 'Plat'}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Prix - Mise en avant, seul élément important */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {typeof prix === 'number' ? prix.toFixed(2) : prix}€
            </span>
            {item.is_formula && item.total_items_price && item.total_items_price > prix && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="line-through">{item.total_items_price.toFixed(2)}€</span>
                <span className="ml-2 text-green-600 dark:text-green-400 font-medium">
                  Économie: {(item.total_items_price - prix).toFixed(2)}€
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour personnaliser le plat */}
      <MenuItemModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => {
          console.log('🔒 MenuItem: Fermeture de la modal demandée');
          setIsModalOpen(false);
        }}
        onAddToCart={handleModalAddToCart}
        restaurantId={restaurantId}
      />
    </div>
    </>
  );
} 