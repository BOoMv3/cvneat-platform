'use client';

import { useState, useEffect, useRef, useMemo } from 'react';

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1280&auto=format&fit=crop';
const FALLBACK_WIDTHS = [320, 480, 640, 800, 1024, 1280];

const combineClasses = (...classes) => classes.filter(Boolean).join(' ');

const collectImageCandidates = (restaurant) => {
  if (!restaurant) return [];

  const candidates = [
    restaurant.optimized_image_url,
    restaurant.cover_image,
    restaurant.coverImage,
    restaurant.image_cover,
    restaurant.imageCover,
    restaurant.card_image,
    restaurant.cardImage,
    restaurant.image_large,
    restaurant.imageLarge,
    restaurant.image,
    restaurant.image_url,
    restaurant.imageUrl,
    restaurant.profile_image,
    restaurant.banner_image,
    restaurant.logo
  ];

  return [...new Set(candidates.filter(Boolean))];
};

const buildSupabaseTransformUrl = (url, width = 800) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('supabase.co') && parsed.pathname.includes('/storage/v1/object/')) {
      const optimizedPath = parsed.pathname.replace('/storage/v1/object/', '/storage/v1/render/image/');
      parsed.pathname = optimizedPath;
      parsed.searchParams.set('width', String(width));
      parsed.searchParams.set('quality', '80');
      parsed.searchParams.set('resize', 'cover');
      parsed.searchParams.set('format', 'webp');
      return parsed.toString();
    }
    return url;
  } catch (error) {
    console.warn('Impossible de construire l’URL optimisée Supabase:', error);
    return url;
  }
};

const buildUnsplashUrl = (url, width = 800) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('images.unsplash.com')) {
      parsed.searchParams.set('auto', 'format');
      parsed.searchParams.set('fit', 'crop');
      parsed.searchParams.set('w', String(width));
      parsed.searchParams.set('q', '80');
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
};

const getOptimizedUrl = (url, width = 800) => {
  if (!url) return DEFAULT_IMAGE;

  if (/^https?:\/\//i.test(url)) {
    if (url.includes('supabase.co/storage/v1/object/')) {
      return buildSupabaseTransformUrl(url, width);
    }

    if (url.includes('images.unsplash.com')) {
      return buildUnsplashUrl(url, width);
    }

    return url;
  }

  // Cas où l’URL stockée ne contient pas le domaine (chemin relatif sur le bucket)
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (baseUrl) {
    const normalizedPath = url.startsWith('/') ? url.slice(1) : url;
    const fullUrl = `${baseUrl}/storage/v1/render/image/public/${normalizedPath}?width=${width}&quality=80&resize=cover&format=webp`;
    return fullUrl;
  }

  return url;
};

export default function OptimizedRestaurantImage({
  restaurant,
  className = '',
  priority = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
}) {
  const candidateUrls = useMemo(() => {
    const candidates = collectImageCandidates(restaurant);
    if (candidates.length === 0) {
      return [DEFAULT_IMAGE];
    }
    return [...candidates, DEFAULT_IMAGE];
  }, [restaurant]);

  const [sourceIndex, setSourceIndex] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  const currentCandidate = candidateUrls[sourceIndex] || DEFAULT_IMAGE;
  const optimizedSrc = useMemo(() => getOptimizedUrl(currentCandidate, 900), [currentCandidate]);
  const srcSet = useMemo(
    () =>
      FALLBACK_WIDTHS.map((width) => `${getOptimizedUrl(currentCandidate, width)} ${width}w`).join(', '),
    [currentCandidate]
  );

  useEffect(() => {
    setSourceIndex(0);
    setImageLoaded(false);
    setImageError(false);
  }, [restaurant]);

  useEffect(() => {
    if (!imgRef.current) return;
    if (imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setImageLoaded(true);
      setImageError(false);
    }
  }, [optimizedSrc]);

  const handleImageError = () => {
    if (sourceIndex < candidateUrls.length - 1) {
      setSourceIndex((prev) => prev + 1);
      setImageLoaded(false);
      return;
    }
    if (!imageError) {
      setImageError(true);
    }
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const containerClasses = combineClasses('relative overflow-hidden', className);
  const showPlaceholder = !imageLoaded && !imageError;

  return (
    <div className={containerClasses} style={{ width: '100%', height: '256px' }}>
      <img
        ref={imgRef}
        src={optimizedSrc}
        srcSet={srcSet}
        sizes={sizes}
        alt={restaurant?.nom || restaurant?.name || 'Restaurant'}
        className={combineClasses(
          'w-full h-full object-cover object-center transition-all duration-500 group-hover:scale-110',
          imageLoaded ? 'opacity-100' : 'opacity-0'
        )}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchpriority={priority ? 'high' : 'auto'}
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
        referrerPolicy="no-referrer"
      />

      {showPlaceholder && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          <div className="animate-pulse text-center">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm font-medium text-gray-600">
              {restaurant?.nom || restaurant?.name || 'Chargement...'}
            </div>
          </div>
        </div>
      )}

      {imageError && (
        <div
          className="absolute inset-0 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center"
          style={{ width: '100%', height: '100%' }}
        >
          <div className="text-center text-gray-600">
            <div className="text-4xl mb-2">🍽️</div>
            <div className="text-sm font-medium">{restaurant?.nom || restaurant?.name || 'Restaurant'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
