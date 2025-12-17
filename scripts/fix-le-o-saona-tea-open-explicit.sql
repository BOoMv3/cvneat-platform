-- Forcer l'ouverture manuelle pour "Le O Saona Tea" en mettant ferme_manuellement = false explicitement
UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE nom ILIKE '%o saona%' OR nom ILIKE '%saona%';

-- Vérifier le résultat
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type_donnee,
  updated_at
FROM restaurants
WHERE nom ILIKE '%o saona%' OR nom ILIKE '%saona%';

