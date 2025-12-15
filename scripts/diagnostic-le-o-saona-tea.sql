-- Diagnostic complet pour "Le O Saona Tea"
-- 1. Vérifier l'état actuel
SELECT 
  id,
  nom,
  ferme_manuellement,
  status,
  horaires,
  CASE 
    WHEN horaires IS NULL THEN 'NULL - Pas d''horaires'
    WHEN horaires::text = '{}' THEN 'Vide - Horaires vides'
    WHEN horaires::text = 'null' THEN 'null - Horaires null'
    ELSE 'Horaires présents'
  END as horaires_status,
  created_at,
  updated_at
FROM restaurants
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%'
ORDER BY created_at DESC;

-- 2. Forcer l'ouverture (mettre à jour)
UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

-- 3. Vérifier après mise à jour
SELECT 
  id,
  nom,
  ferme_manuellement,
  status,
  updated_at
FROM restaurants
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

