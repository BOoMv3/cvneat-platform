-- Script complet pour vérifier le statut de "La Bonne Pâte"
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as ferme_manuellement_type,
  CASE 
    WHEN ferme_manuellement IS NULL THEN 'NULL'
    WHEN ferme_manuellement = true THEN 'true (bool)'
    WHEN ferme_manuellement = false THEN 'false (bool)'
    WHEN ferme_manuellement::text = 'true' THEN 'true (text)'
    WHEN ferme_manuellement::text = 'false' THEN 'false (text)'
    WHEN ferme_manuellement::text = '1' THEN '1 (text/number)'
    WHEN ferme_manuellement::text = '0' THEN '0 (text/number)'
    ELSE 'autre: ' || ferme_manuellement::text
  END as ferme_manuellement_value,
  horaires,
  status,
  created_at,
  updated_at
FROM restaurants
WHERE nom ILIKE '%bonne pâte%' OR nom ILIKE '%bonne pate%'
ORDER BY created_at DESC;

