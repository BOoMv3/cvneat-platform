'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPlus, FaThumbsUp, FaLock } from 'react-icons/fa';
import MenuItemModal from './MenuItemModal';

export default function MenuItem({ item, onAddToCart, restaurantId }) {
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
    promotion,
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
    setIsAdding(true);
    
    // Si c'est une formule, l'ajouter directement sans modal
    if (item.is_formula) {
      onAddToCart(item);
      setTimeout(() => {
        setIsAdding(false);
      }, 1500);
      return;
    }
    
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
    // Si c'est une formule, ne pas ouvrir le modal (les formules sont ajoutées directement)
    if (item.is_formula) {
      handleAddToCart();
      return;
    }
    setIsModalOpen(true);
  };

  const handleModalAddToCart = (customizedItem) => {
    onAddToCart(customizedItem);
    setIsModalOpen(false);
  };

  return (
    <>
      <div 
        className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-lg hover:scale-[1.02] cursor-pointer group"
        onClick={handleItemClick}
      >
      {/* Image de l'article - Design épuré */}
      <div className="relative h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 overflow-hidden">
        {image_url ? (
          <Image
            src={image_url}
            alt={nom}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-600 dark:to-gray-700 flex items-center justify-center">
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

        {/* Promotion */}
        {promotion && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            {promotion}
          </div>
        )}
      </div>

      {/* Informations de l'article - Design minimaliste */}
      <div className="p-5 space-y-3">
        {/* Titre - Plus grand et visible */}
        <h3 className="font-bold text-lg text-gray-900 dark:text-white line-clamp-2 leading-tight">
          {nom}
          {item.is_formula && (
            <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
              Formule
            </span>
          )}
        </h3>

        {/* Description pour les formules */}
        {item.is_formula && item.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
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
            {promotion && (
              <span className="text-sm text-gray-400 dark:text-gray-500 line-through ml-2 font-normal">
                {typeof prix === 'number' ? (prix * 2).toFixed(2) : prix}€
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Modal pour personnaliser le plat */}
      <MenuItemModal
        item={item}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleModalAddToCart}
        restaurantId={restaurantId}
      />
    </div>
    </>
  );
} 