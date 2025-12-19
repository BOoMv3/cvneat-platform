-- Script pour forcer l'ouverture de "La Bonne Pâte"
-- Ce script met ferme_manuellement à false explicitement

UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%';

-- Vérifier le résultat
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type,
  updated_at
FROM restaurants
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%';
