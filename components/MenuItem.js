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
    
    // Appeler la fonction d'ajout au panier
    onAddToCart(item);
    
    // Garder l'animation active pendant 1.5 secondes
    setTimeout(() => {
      setIsAdding(false);
    }, 1500);
  };

  const handleItemClick = () => {
    setIsModalOpen(true);
  };

  const handleModalAddToCart = (customizedItem) => {
    onAddToCart(customizedItem);
    setIsModalOpen(false);
  };

  return (
    <>
      <div 
        className="bg-white rounded-lg border border-gray-100 overflow-hidden transition-all duration-300 w-full max-w-sm mx-auto cursor-pointer"
        onClick={handleItemClick}
      >
      {/* Image de l'article - PROPORTIONS MOBILE OPTIMISÉES avec bords arrondis */}
      <div className="relative h-36 w-full bg-gradient-to-br from-purple-100 to-orange-100 rounded-t-lg overflow-hidden">
        {image_url ? (
          <Image
            src={image_url}
            alt={nom}
            fill
            className="object-cover rounded-t-lg"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-200 to-orange-200 flex items-center justify-center rounded-t-lg">
            <span className="text-xl">🍽️</span>
          </div>
        )}

        {/* Badge populaire - POSITION MOBILE OPTIMISÉE */}
        {is_popular && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            N°{popularNumber}
          </div>
        )}

        {/* Bouton d'ajout avec animation - TAILLE MOBILE OPTIMISÉE */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Empêcher l'ouverture de la modal
            handleAddToCart();
          }}
          disabled={isAdding}
          className={`absolute bottom-2 right-2 w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform ${
            isAdding
              ? 'bg-green-500 text-white scale-110 shadow-xl animate-pulse'
              : 'bg-white text-gray-800 hover:bg-gray-50 hover:scale-105'
          }`}
        >
          {isAdding ? (
            <>
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
              <FaPlus className="w-3.5 h-3.5 relative z-10 animate-bounce" />
            </>
          ) : (
            <FaPlus className="w-3.5 h-3.5" />
          )}
        </button>

        {/* Promotion - POSITION MOBILE OPTIMISÉE */}
        {promotion && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {promotion}
          </div>
        )}
      </div>

      {/* Informations de l'article - PROPORTIONS MOBILE OPTIMISÉES */}
      <div className="p-3">
        {/* Titre - TAILLE MOBILE OPTIMISÉE */}
        <h3 className="font-bold text-sm text-gray-900 mb-2 line-clamp-1">
          {nom}
        </h3>

        {/* Description - TAILLE MOBILE OPTIMISÉE */}
        {description && (
          <p className="text-gray-600 text-xs mb-2 line-clamp-2">
            {description}
          </p>
        )}

        {/* Prix et évaluation - PROPORTIONS MOBILE OPTIMISÉES */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-base font-bold text-gray-900">
              {typeof prix === 'number' ? prix.toFixed(2) : prix}€
            </span>
            {promotion && (
              <span className="text-xs text-gray-500 line-through">
                {typeof prix === 'number' ? (prix * 2).toFixed(2) : prix}€
              </span>
            )}
          </div>

          {/* Note et nombre d'avis - TAILLE MOBILE OPTIMISÉE */}
          <div className="flex items-center gap-1 text-xs text-gray-600">
            <FaThumbsUp className="text-green-500 w-3.5 h-3.5" />
            <span>
              {itemRating}% ({itemReviewCount})
            </span>
          </div>
        </div>

        {/* Offre spéciale - TAILLE MOBILE OPTIMISÉE */}
        {promotion && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-red-600 font-medium">
            <FaLock className="text-red-500 w-3.5 h-3.5" />
            <span>1+1 gratuit</span>
          </div>
        )}
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