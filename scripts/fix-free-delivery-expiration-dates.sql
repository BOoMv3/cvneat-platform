-- Corriger les dates d'expiration des gains "Livraison offerte" qui ont été créés avec la date 2024
-- Mettre à jour pour utiliser 2025 (23 décembre 2025 23:59:59)

UPDATE wheel_wins
SET valid_until = '2025-12-23 23:59:59.999+00'::timestamptz
WHERE prize_type = 'free_delivery'
  AND valid_until < NOW()
  AND used_at IS NULL
  AND promo_code IS NOT NULL;

-- Mettre à jour aussi les codes promo correspondants
UPDATE promo_codes
SET valid_until = '2025-12-23 23:59:59.999+00'::timestamptz
WHERE code LIKE 'ROULETTE%'
  AND discount_type = 'free_delivery'
  AND valid_until < NOW()
  AND id IN (
    SELECT promo_code_id 
    FROM wheel_wins 
    WHERE prize_type = 'free_delivery' 
      AND used_at IS NULL
  );

-- Afficher les gains corrigés
SELECT 
  id,
  user_id,
  promo_code,
  prize_type,
  valid_until,
  used_at,
  created_at
FROM wheel_wins
WHERE prize_type = 'free_delivery'
  AND promo_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

