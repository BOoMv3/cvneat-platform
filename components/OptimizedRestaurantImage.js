'use client';

import { useState, useEffect } from 'react';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop';

export default function OptimizedRestaurantImage({ 
  restaurant, 
  className = '', 
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    restaurant.image_url || 
    restaurant.imageUrl || 
    restaurant.profile_image || 
    restaurant.banner_image || 
    DEFAULT_IMAGE
  );

  useEffect(() => {
    // Reset states when restaurant changes
    setImageError(false);
    setImageLoaded(false);
    setCurrentSrc(
      restaurant.image_url || 
      restaurant.imageUrl || 
      restaurant.profile_image || 
      restaurant.banner_image || 
      DEFAULT_IMAGE
    );
  }, [restaurant]);

  const handleImageError = () => {
    if (currentSrc !== DEFAULT_IMAGE) {
      setCurrentSrc(DEFAULT_IMAGE);
      setImageError(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Image normale pour la compatibilité mobile */}
      <img
        src={currentSrc}
        alt={restaurant.nom || restaurant.name || 'Restaurant'}
        className={`w-full h-full object-cover object-center group-hover:scale-110 transition-transform duration-500 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        style={{
          minHeight: '100%',
          minWidth: '100%',
          objectFit: 'cover',
          objectPosition: 'center'
        }}
      />
      
      {/* Placeholder pendant le chargement */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="animate-pulse">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm font-medium text-gray-600">{restaurant.nom || restaurant.name}</div>
          </div>
        </div>
      )}
      
      {/* Fallback si l'image ne charge pas du tout */}
      {imageError && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm font-medium">{restaurant.nom || restaurant.name}</div>
          </div>
        </div>
      )}
    </div>
  );
}
