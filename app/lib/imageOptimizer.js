// Système d'optimisation d'images

export const optimizeImageUrl = (url, options = {}) => {
  if (!url) return null;
  
  const {
    width,
    height,
    quality = 80,
    format = 'webp',
    fit = 'cover'
  } = options;

  // Si c'est une image externe ou une URL complète
  if (url.startsWith('http')) {
    // Utiliser un service d'optimisation d'images comme Cloudinary ou ImageKit
    // Pour cet exemple, on retourne l'URL originale
    return url;
  }

  // Pour les images locales, on peut utiliser Next.js Image Optimization
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());
  if (format) params.append('f', format);
  if (fit) params.append('fit', fit);

  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};

export const getImageSizes = (type) => {
  const sizes = {
    thumbnail: { width: 150, height: 150 },
    small: { width: 300, height: 200 },
    medium: { width: 600, height: 400 },
    large: { width: 1200, height: 800 },
    hero: { width: 1920, height: 1080 }
  };

  return sizes[type] || sizes.medium;
};

export const generateResponsiveImages = (baseUrl) => {
  if (!baseUrl) return null;

  const breakpoints = [
    { width: 320, suffix: 'sm' },
    { width: 640, suffix: 'md' },
    { width: 768, suffix: 'lg' },
    { width: 1024, suffix: 'xl' },
    { width: 1280, suffix: '2xl' }
  ];

  return breakpoints.map(bp => ({
    src: optimizeImageUrl(baseUrl, { width: bp.width, quality: 80 }),
    width: bp.width,
    suffix: bp.suffix
  }));
};

export const lazyLoadImage = (element) => {
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          img.src = img.dataset.src;
          img.classList.remove('lazy');
          imageObserver.unobserve(img);
        }
      });
    });

    imageObserver.observe(element);
  } else {
    // Fallback pour les navigateurs plus anciens
    element.src = element.dataset.src;
  }
};

export const preloadCriticalImages = (imageUrls) => {
  imageUrls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = url;
    document.head.appendChild(link);
  });
};

export const compressImage = async (file, options = {}) => {
  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.8,
    type = 'image/jpeg'
  } = options;

  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculer les nouvelles dimensions
      let { width, height } = img;
      
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // Dessiner l'image redimensionnée
      ctx.drawImage(img, 0, 0, width, height);

      // Convertir en blob
      canvas.toBlob(resolve, type, quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

export const getImageMetadata = (file) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight,
        size: file.size,
        type: file.type
      });
    };
    
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

// Composant React pour l'optimisation d'images
export const OptimizedImage = ({ 
  src, 
  alt, 
  width, 
  height, 
  className = '',
  priority = false,
  ...props 
}) => {
  const optimizedSrc = optimizeImageUrl(src, { width, height });
  
  return (
    <img
      src={optimizedSrc}
      alt={alt}
      width={width}
      height={height}
      className={`${className} ${!priority ? 'lazy' : ''}`}
      loading={priority ? 'eager' : 'lazy'}
      data-src={src}
      {...props}
    />
  );
};
