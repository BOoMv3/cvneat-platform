'use client';

import { useEffect } from 'react';
import { getRestaurantThemeId } from '@/lib/restaurant-theme';

const FONT_URL =
  'https://fonts.googleapis.com/css2?family=Great+Vibes&family=Oswald:wght@400;500;600;700&family=Lato:wght@300;400;700&display=swap';

export default function RestaurantThemeShell({ restaurant, children, className = '' }) {
  const themeId = getRestaurantThemeId(restaurant);

  useEffect(() => {
    if (themeId !== 'la-bonne-pate') return;
    const id = 'cvneat-theme-la-bonne-pate-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = FONT_URL;
    document.head.appendChild(link);
  }, [themeId]);

  if (!themeId) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`theme-${themeId} ${className}`.trim()}>
      {children}
    </div>
  );
}
