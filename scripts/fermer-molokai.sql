-- Script pour fermer manuellement le restaurant "Molokai"
UPDATE restaurants
SET 
  ferme_manuellement = true,
  updated_at = NOW()
WHERE nom ILIKE '%molokai%';

-- Vérifier le résultat
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type,
  updated_at
FROM restaurants
WHERE nom ILIKE '%molokai%';

