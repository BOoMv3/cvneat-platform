-- Forcer l'ouverture du restaurant "Le O Saona Tea"
-- Ce script met à jour ferme_manuellement à false et force la mise à jour

UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%';

-- Vérifier le résultat immédiatement
SELECT 
  id,
  nom,
  ferme_manuellement,
  status,
  updated_at,
  CASE 
    WHEN horaires IS NULL THEN 'NULL'
    WHEN horaires::text = '{}' THEN 'Vide'
    ELSE 'Configuré'
  END as horaires_status
FROM restaurants
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%'
ORDER BY created_at DESC;

