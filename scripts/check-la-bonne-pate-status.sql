-- Vérifier le statut de "La Bonne Pâte"
SELECT 
  id,
  nom,
  ferme_manuellement,
  horaires,
  created_at
FROM restaurants
WHERE LOWER(nom) LIKE '%bonne pâte%' OR LOWER(nom) LIKE '%bonne pate%'
ORDER BY created_at DESC;

-- Si ferme_manuellement est à true, le mettre à false
-- Décommentez la ligne suivante pour corriger :
-- UPDATE restaurants SET ferme_manuellement = false WHERE LOWER(nom) LIKE '%bonne pâte%' OR LOWER(nom) LIKE '%bonne pate%';

