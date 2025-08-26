'use client';

import Image from 'next/image';
import { FaPlus, FaThumbsUp, FaLock } from 'react-icons/fa';

export default function MenuItem({ item, onAddToCart, isAdding = false }) {
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

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-all duration-300">
      {/* Image de l'article */}
      <div className="relative h-48 bg-gradient-to-br from-purple-100 to-orange-100">
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
            <span className="text-4xl">🍽️</span>
          </div>
        )}

        {/* Badge populaire */}
        {is_popular && (
          <div className="absolute top-3 left-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            Le n° {Math.floor(Math.random() * 3) + 1} le plus aimé...
          </div>
        )}

        {/* Bouton d'ajout */}
        <button
          onClick={() => onAddToCart(item)}
          disabled={isAdding}
          className={`absolute bottom-3 right-3 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all ${
            isAdding
              ? 'bg-green-500 text-white scale-110'
              : 'bg-white text-gray-800 hover:bg-gray-50 hover:scale-105'
          }`}
        >
          <FaPlus className="w-4 h-4" />
        </button>

        {/* Promotion */}
        {promotion && (
          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            {promotion}
          </div>
        )}
      </div>

      {/* Informations de l'article */}
      <div className="p-4">
        {/* Titre */}
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {nom}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">
            {description}
          </p>
        )}

        {/* Prix et évaluation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-900">
              {typeof prix === 'number' ? prix.toFixed(2) : prix}€
            </span>
            {promotion && (
              <span className="text-sm text-gray-500 line-through">
                {typeof prix === 'number' ? (prix * 2).toFixed(2) : prix}€
              </span>
            )}
          </div>

          {/* Note et nombre d'avis */}
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <FaThumbsUp className="text-green-500" />
            <span>
              {rating || Math.floor(Math.random() * 20) + 80}% ({review_count || Math.floor(Math.random() * 100) + 50})
            </span>
          </div>
        </div>

        {/* Offre spéciale */}
        {promotion && (
          <div className="mt-3 flex items-center gap-2 text-sm text-red-600 font-medium">
            <FaLock className="text-red-500" />
            <span>Un acheté = un offert</span>
          </div>
        )}
      </div>
    </div>
  );
} 