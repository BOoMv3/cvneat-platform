'use client';

import { useState } from 'react';
import { FaStar } from 'react-icons/fa';

export default function StarRating({ 
  rating = 0, 
  maxRating = 5, 
  size = 'sm',
  interactive = false,
  onRatingChange = null,
  className = ''
}) {
  const [hoveredRating, setHoveredRating] = useState(0);

  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const handleStarClick = (starRating) => {
    if (interactive && onRatingChange) {
      onRatingChange(starRating);
    }
  };

  const handleStarHover = (starRating) => {
    if (interactive) {
      setHoveredRating(starRating);
    }
  };

  const handleStarLeave = () => {
    if (interactive) {
      setHoveredRating(0);
    }
  };

  const displayRating = interactive ? hoveredRating || rating : rating;

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      {[...Array(maxRating)].map((_, index) => {
        const starRating = index + 1;
        const isFilled = starRating <= displayRating;
        
        return (
          <FaStar
            key={index}
            className={`${sizes[size]} ${
              isFilled 
                ? 'text-yellow-400' 
                : 'text-gray-300'
            } ${
              interactive 
                ? 'cursor-pointer hover:scale-110 transition-transform' 
                : ''
            }`}
            onClick={() => handleStarClick(starRating)}
            onMouseEnter={() => handleStarHover(starRating)}
            onMouseLeave={handleStarLeave}
          />
        );
      })}
      {!interactive && (
        <span className="text-gray-600 text-sm ml-1">
          ({rating.toFixed(1)})
        </span>
      )}
    </div>
  );
}