'use client';

import { useState } from 'react';
import Image from 'next/image';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop';

export default function OptimizedRestaurantImage({ 
  restaurant, 
  className = '', 
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) {
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(
    restaurant.image_url || 
    restaurant.imageUrl || 
    restaurant.profile_image || 
    restaurant.banner_image || 
    DEFAULT_IMAGE
  );

  const handleImageError = () => {
    if (currentSrc !== DEFAULT_IMAGE) {
      setCurrentSrc(DEFAULT_IMAGE);
      setImageError(true);
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image
        src={currentSrc}
        alt={restaurant.nom || restaurant.name || 'Restaurant'}
        fill
        className="object-cover group-hover:scale-110 transition-transform duration-500"
        unoptimized
        priority={priority}
        sizes={sizes}
        onError={handleImageError}
        onLoad={() => setImageError(false)}
      />
      
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
