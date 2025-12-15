-- Ouvrir le restaurant "Le O Saona Tea" et vérifier son état
-- 1. Mettre à jour ferme_manuellement à false
UPDATE restaurants
SET ferme_manuellement = false
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

-- 2. Vérifier l'état actuel
SELECT 
  id,
  nom,
  ferme_manuellement,
  CASE 
    WHEN horaires IS NULL THEN 'Pas d''horaires'
    WHEN horaires::text = '{}' THEN 'Horaires vides'
    ELSE 'Horaires configurés'
  END as horaires_status,
  horaires,
  status,
  created_at
FROM restaurants
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%'
ORDER BY created_at DESC;

