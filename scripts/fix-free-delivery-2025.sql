-- Corriger les dates d'expiration des gains "Livraison offerte" qui ont été créés avec la date 2024
-- Mettre à jour pour utiliser 2025 (23 décembre 2025 23:59:59)

-- Corriger les gains dans wheel_wins
UPDATE wheel_wins
SET valid_until = '2025-12-23 23:59:59.999+00'::timestamptz
WHERE prize_type = 'free_delivery'
  AND valid_until < '2025-01-01'::timestamptz  -- Tous ceux qui expirent avant 2025
  AND used_at IS NULL  -- Seulement ceux qui ne sont pas encore utilisés
  AND promo_code IS NOT NULL;

-- Mettre à jour aussi les codes promo correspondants
UPDATE promo_codes
SET valid_until = '2025-12-23 23:59:59.999+00'::timestamptz
WHERE code LIKE 'ROULETTE%'
  AND discount_type = 'free_delivery'
  AND valid_until < '2025-01-01'::timestamptz  -- Tous ceux qui expirent avant 2025
  AND id IN (
    SELECT promo_code_id 
    FROM wheel_wins 
    WHERE prize_type = 'free_delivery' 
      AND used_at IS NULL
      AND promo_code IS NOT NULL
  );

-- Afficher les gains corrigés
SELECT 
  id,
  user_id,
  promo_code,
  prize_type,
  valid_until,
  used_at,
  created_at,
  CASE 
    WHEN valid_until >= NOW() THEN 'Actif'
    WHEN used_at IS NOT NULL THEN 'Utilisé'
    ELSE 'Expiré'
  END as statut
FROM wheel_wins
WHERE prize_type = 'free_delivery'
  AND promo_code IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

