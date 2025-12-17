-- Script pour vérifier le nombre de restaurants dans la base de données
SELECT 
  COUNT(*) as total_restaurants,
  COUNT(CASE WHEN status = 'active' THEN 1 END) as active_restaurants,
  COUNT(CASE WHEN status IS NULL THEN 1 END) as null_status_restaurants
FROM restaurants;

-- Afficher les 10 premiers restaurants avec leurs statuts
SELECT 
  id,
  nom,
  status,
  ferme_manuellement,
  created_at
FROM restaurants
ORDER BY created_at DESC
LIMIT 10;

