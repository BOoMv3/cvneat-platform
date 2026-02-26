-- Code promo "livraison gratuite" à usage unique (1 personne, 1 utilisation)
-- Ex: pour s'excuser d'un retard de livraison
INSERT INTO promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  min_order_amount,
  max_uses,
  max_uses_per_user,
  current_uses,
  valid_from,
  valid_until,
  is_active
) VALUES (
  'RETARD_OFFERT',
  'Livraison gratuite - offerte pour nous excuser d''un retard',
  'free_delivery',
  0,
  0,
  1,
  1,
  0,
  NOW(),
  NOW() + INTERVAL '6 months',
  TRUE
)
ON CONFLICT (code) DO NOTHING;
