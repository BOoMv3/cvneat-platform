'use client';

import RestaurantDetailContent from '../../components/RestaurantDetailContent';

// Route web classique: /restaurants/:id
// (Utile pour les liens profonds, SEO, et compat web.)
export default function RestaurantDetailPage({ params }) {
  const restaurantId = params?.id || null;
  return <RestaurantDetailContent restaurantId={restaurantId} />;
}


