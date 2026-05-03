-- Type promo : réduction en % sur les frais de livraison (pas sur le panier).
-- Le checkout / API orders gèrent ce type côté application.

ALTER TABLE promo_codes DROP CONSTRAINT IF EXISTS promo_codes_discount_type_check;

ALTER TABLE promo_codes
  ADD CONSTRAINT promo_codes_discount_type_check
  CHECK (discount_type IN ('percentage', 'fixed', 'free_delivery', 'delivery_percent'));

-- Code famille : −50 % sur la livraison (usage multiple par défaut).
INSERT INTO promo_codes (
  code,
  description,
  discount_type,
  discount_value,
  min_order_amount,
  max_uses_per_user,
  is_active
) VALUES (
  'FAMILLE50LIV',
  'Famille : −50 % sur les frais de livraison',
  'delivery_percent',
  50,
  0,
  999,
  TRUE
)
ON CONFLICT (code) DO UPDATE SET
  description = EXCLUDED.description,
  discount_type = EXCLUDED.discount_type,
  discount_value = EXCLUDED.discount_value,
  min_order_amount = EXCLUDED.min_order_amount,
  max_uses_per_user = EXCLUDED.max_uses_per_user,
  is_active = EXCLUDED.is_active;
