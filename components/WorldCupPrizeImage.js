'use client';

/**
 * Image lot / ballon CDM (fichier local dans /public/world-cup).
 */
export default function WorldCupPrizeImage({ src, alt, className = '', style }) {
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt || ''}
      className={className}
      style={style}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
