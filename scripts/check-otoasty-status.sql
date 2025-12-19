-- Script pour vérifier le statut de "O Toasty"
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as ferme_manuellement_type,
  CASE 
    WHEN ferme_manuellement IS NULL THEN 'NULL'
    WHEN ferme_manuellement = true THEN 'true (bool) - FERMÉ'
    WHEN ferme_manuellement = false THEN 'false (bool) - OUVERT (vérifie horaires)'
    WHEN ferme_manuellement::text = 'true' THEN 'true (text) - FERMÉ'
    WHEN ferme_manuellement::text = 'false' THEN 'false (text) - OUVERT (vérifie horaires)'
    WHEN ferme_manuellement::text = '1' THEN '1 (text/number) - FERMÉ'
    WHEN ferme_manuellement::text = '0' THEN '0 (text/number) - OUVERT (vérifie horaires)'
    ELSE 'autre: ' || ferme_manuellement::text
  END as ferme_manuellement_value,
  status,
  horaires,
  updated_at
FROM restaurants
WHERE nom ILIKE '%toasty%' OR nom ILIKE '%otoasty%'
ORDER BY created_at DESC;

