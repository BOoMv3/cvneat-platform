-- Script SQL pour créer un code promo de livraison gratuite
-- Utilisable 1 seule fois par client
-- À exécuter dans Supabase SQL Editor

-- Générer un code unique pour la livraison gratuite
-- Code: LIVRAISONFREE (vous pouvez le modifier)
INSERT INTO promo_codes (
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses_per_user,
    is_active,
    valid_from,
    valid_until
) VALUES (
    'LIVRAISONFREE',
    'Livraison offerte sur votre commande',
    'free_delivery',
    0.00,
    0.00, -- Pas de minimum de commande (ou vous pouvez mettre un minimum comme 15.00)
    1,    -- 1 seule utilisation par client
    TRUE,
    NOW(),
    NULL  -- Pas de date d'expiration (ou vous pouvez mettre une date comme NOW() + INTERVAL '30 days')
)
ON CONFLICT (code) DO UPDATE
SET 
    description = EXCLUDED.description,
    discount_type = EXCLUDED.discount_type,
    discount_value = EXCLUDED.discount_value,
    min_order_amount = EXCLUDED.min_order_amount,
    max_uses_per_user = EXCLUDED.max_uses_per_user,
    is_active = EXCLUDED.is_active,
    valid_from = EXCLUDED.valid_from,
    valid_until = EXCLUDED.valid_until,
    updated_at = NOW();

-- Vérifier que le code a été créé
SELECT 
    code,
    description,
    discount_type,
    discount_value,
    min_order_amount,
    max_uses_per_user,
    is_active,
    valid_from,
    valid_until
FROM promo_codes
WHERE code = 'LIVRAISONFREE';

