'use client';

import { useState, useEffect, useRef } from 'react';

// Plus d'image par défaut - afficher un placeholder si pas d'image
const DEFAULT_IMAGE = null;

export default function OptimizedRestaurantImage({ 
  restaurant, 
  className = '', 
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef(null);
  const [currentSrc, setCurrentSrc] = useState(
    restaurant.image_url || 
    restaurant.imageUrl || 
    restaurant.profile_image || 
    restaurant.banner_image || 
    null
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
      null
    );
  }, [restaurant]);

  useEffect(() => {
    if (!imgRef.current) return;

    if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
      setImageError(false);
    }
  }, [currentSrc]);

  const handleImageError = () => {
    // Si l'image ne charge pas, afficher le placeholder
    setCurrentSrc(null);
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  return (
    <div className={`relative overflow-hidden ${className}`} style={{ width: '100%', height: '256px' }}>
      {/* Image normale pour la compatibilité mobile - seulement si une image existe */}
      {currentSrc && (
        <img
          ref={imgRef}
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
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '256px',
            objectFit: 'cover',
            objectPosition: 'center',
            display: 'block'
          }}
        />
      )}
      
      {/* Placeholder si pas d'image ou pendant le chargement */}
      {(!currentSrc || !imageLoaded || imageError) && (
        <div className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center" style={{ width: '100%', height: '100%' }}>
          <div className={`text-center ${!imageLoaded && !imageError ? 'animate-pulse' : ''}`}>
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm font-medium text-gray-600">{restaurant.nom || restaurant.name}</div>
            {!currentSrc && (
              <div className="text-xs text-gray-500 mt-1">Aucune image</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
