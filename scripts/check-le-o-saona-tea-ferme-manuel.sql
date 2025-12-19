-- Vérifier la valeur exacte de ferme_manuellement pour "Le O Saona Tea"
SELECT 
  id,
  nom,
  ferme_manuellement,
  pg_typeof(ferme_manuellement) as type_donnee,
  CASE 
    WHEN ferme_manuellement IS NULL THEN 'NULL'
    WHEN ferme_manuellement = true THEN 'TRUE'
    WHEN ferme_manuellement = false THEN 'FALSE'
    ELSE 'AUTRE'
  END as valeur_interpretation,
  horaires,
  updated
  _at
FROM restaurants
WHERE nom ILIKE '%o saona%' OR nom ILIKE '%saona%'
ORDER BY updated_at DESC;

