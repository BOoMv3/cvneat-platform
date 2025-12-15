-- Forcer l'ouverture du restaurant "La Bonne Pâte"
-- Ce script met à jour ferme_manuellement à false et force la mise à jour

UPDATE restaurants
SET 
  ferme_manuellement = false,
  updated_at = NOW()
WHERE LOWER(nom) LIKE '%bonne pate%' OR LOWER(nom) LIKE '%bonne pâte%' OR LOWER(nom) LIKE '%la bonne pate%' OR LOWER(nom) LIKE '%la bonne pâte%';

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
  END as horaires_status,
  horaires
FROM restaurants
WHERE LOWER(nom) LIKE '%bonne pate%' OR LOWER(nom) LIKE '%bonne pâte%' OR LOWER(nom) LIKE '%la bonne pate%' OR LOWER(nom) LIKE '%la bonne pâte%'
ORDER BY created_at DESC;

