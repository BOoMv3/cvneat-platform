'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FaPlus, FaThumbsUp, FaLock } from 'react-icons/fa';

export default function MenuItem({ item, onAddToCart }) {
  const [isAdding, setIsAdding] = useState(false);
  const [itemRating, setItemRating] = useState(null);
  const [itemReviewCount, setItemReviewCount] = useState(null);
  const [popularNumber, setPopularNumber] = useState(null);
  
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300 w-full max-w-xs">
      {/* Image de l'article - PROPORTIONS STANDARD */}
      <div className="relative h-40 w-full bg-gradient-to-br from-purple-100 to-orange-100">
        {image_url ? (
          <Image
            src={image_url}
            alt={nom}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-200 to-orange-200 flex items-center justify-center">
            <span className="text-2xl">🍽️</span>
          </div>
        )}

        {/* Badge populaire - POSITION STANDARD */}
        {is_popular && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            N°{popularNumber}
          </div>
        )}

        {/* Bouton d'ajout avec animation - TAILLE STANDARD */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`absolute bottom-2 right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 transform ${
            isAdding
              ? 'bg-green-500 text-white scale-110 shadow-xl animate-pulse'
              : 'bg-white text-gray-800 hover:bg-gray-50 hover:scale-105'
          }`}
        >
          {isAdding ? (
            <>
              <div className="absolute inset-0 bg-green-400 rounded-full animate-ping"></div>
              <FaPlus className="w-4 h-4 relative z-10 animate-bounce" />
            </>
          ) : (
            <FaPlus className="w-4 h-4" />
          )}
        </button>

        {/* Promotion - POSITION STANDARD */}
        {promotion && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {promotion}
          </div>
        )}
      </div>

      {/* Informations de l'article - PROPORTIONS STANDARD */}
      <div className="p-3">
        {/* Titre - TAILLE STANDARD */}
        <h3 className="font-bold text-base text-gray-900 mb-2 line-clamp-1">
          {nom}
        </h3>

        {/* Description - TAILLE STANDARD */}
        {description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Prix et évaluation - PROPORTIONS STANDARD */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">
              {typeof prix === 'number' ? prix.toFixed(2) : prix}€
            </span>
            {promotion && (
              <span className="text-sm text-gray-500 line-through">
                {typeof prix === 'number' ? (prix * 2).toFixed(2) : prix}€
              </span>
            )}
          </div>

          {/* Note et nombre d'avis - TAILLE STANDARD */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <FaThumbsUp className="text-green-500 w-4 h-4" />
            <span>
              {itemRating}% ({itemReviewCount})
            </span>
          </div>
        </div>

        {/* Offre spéciale - TAILLE STANDARD */}
        {promotion && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium">
            <FaLock className="text-red-500 w-4 h-4" />
            <span>1+1 gratuit</span>
          </div>
        )}
      </div>
    </div>
  );
} 