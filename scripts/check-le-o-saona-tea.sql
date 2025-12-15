-- Vérifier l'état du restaurant "Le O Saona Tea"
SELECT 
  id,
  nom,
  ferme_manuellement,
  horaires,
  status,
  created_at
FROM restaurants
WHERE LOWER(nom) LIKE '%saona%' OR LOWER(nom) LIKE '%o saona%'
ORDER BY created_at DESC;

