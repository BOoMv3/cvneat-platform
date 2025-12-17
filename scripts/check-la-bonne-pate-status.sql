-- Script pour vérifier le statut de "La Bonne Pâte"
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as ferme_manuellement_type,
  horaires->>'lundi' as horaires_lundi,
  horaires->>'mardi' as horaires_mardi,
  horaires->>'mercredi' as horaires_mercredi,
  horaires->>'jeudi' as horaires_jeudi,
  horaires->>'vendredi' as horaires_vendredi,
  horaires->>'samedi' as horaires_samedi,
  horaires->>'dimanche' as horaires_dimanche,
  status,
  created_at,
  updated_at
FROM restaurants
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%'
ORDER BY updated_at DESC;

-- Pour forcer l'ouverture (si nécessaire)
-- UPDATE restaurants
-- SET ferme_manuellement = FALSE, updated_at = NOW()
-- WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%';
