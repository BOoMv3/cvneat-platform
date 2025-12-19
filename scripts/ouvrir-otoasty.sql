-- Script pour réouvrir "O Toasty" manuellement
-- Met ferme_manuellement = false pour permettre l'ouverture selon les horaires

UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE nom ILIKE '%toasty%' OR nom ILIKE '%otoasty%';

-- Vérifier le résultat
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type,
  updated_at
FROM restaurants
WHERE nom ILIKE '%toasty%' OR nom ILIKE '%otoasty%';

